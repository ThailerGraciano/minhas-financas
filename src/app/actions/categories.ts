'use server';

import { db } from '@/db';
import { categories, subcategories, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getCategories() {
  return await db.query.categories.findMany({
    with: { subcategories: true },
    orderBy: (categories, { asc }) => [asc(categories.name)]
  });
}

export async function createCategory(name: string, type: 'income' | 'expense', icon?: string) {
  try {
    const result = await db.transaction(async (tx) => {
      const [category] = await tx
        .insert(categories)
        .values({ name, type, icon: icon || 'Tag' })
        .returning();

      // Toda categoria nasce com a subcategoria padrão "Geral"
      await tx
        .insert(subcategories)
        .values({ name: 'Geral', categoryId: category.id });

      return category;
    });

    revalidatePath('/categories');
    revalidatePath('/'); // Dashboard where form is
    return { success: true, category: result };
  } catch (error) {
    console.error('Error creating category:', error);
    return { success: false, error: 'Failed to create category' };
  }
}

export async function createSubcategory(name: string, categoryId: string) {
  try {
    const [subcategory] = await db.insert(subcategories).values({ name, categoryId: Number(categoryId) }).returning();
    revalidatePath('/categories');
    revalidatePath('/'); 
    return { success: true, subcategory };
  } catch (error) {
    console.error('Error creating subcategory:', error);
    return { success: false, error: 'Failed to create subcategory' };
  }
}

export async function updateCategoryIcon(id: number, icon: string) {
  try {
    await db.update(categories).set({ icon }).where(eq(categories.id, id));
    revalidatePath('/categories');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating category icon:', error);
    return { success: false, error: 'Falha ao atualizar o ícone da categoria' };
  }
}

export async function deleteCategory(id: number) {
  try {
    // 1. Check if category is linked to any transaction
    const linkedTransactions = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.categoryId, id))
      .limit(1);

    if (linkedTransactions.length > 0) {
      return { 
        success: false, 
        error: 'Esta categoria não pode ser excluída pois possui despesas/receitas vinculadas a ela.' 
      };
    }

    // 2. If no transactions are linked, we can delete the category.
    // Note: Category has subcategories (like the default "Geral"). We must delete the subcategories first or use a transaction to delete both.
    await db.transaction(async (tx) => {
      // First delete associated subcategories
      await tx.delete(subcategories).where(eq(subcategories.categoryId, id));
      // Then delete the category
      await tx.delete(categories).where(eq(categories.id, id));
    });

    revalidatePath('/categories');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: 'Falha ao excluir a categoria.' };
  }
}
