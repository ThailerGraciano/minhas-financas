'use server';

import { db } from '@/db';
import { categories, subcategories, transactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export async function getCategories() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  return await db.query.categories.findMany({
    where: eq(categories.userId, userId),
    with: { subcategories: true },
    orderBy: (categories, { asc }) => [asc(categories.name)]
  });
}

export async function createCategory(name: string, type: 'income' | 'expense', icon?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const result = await db.transaction(async (tx) => {
      const [category] = await tx
        .insert(categories)
        .values({ userId, name, type, icon: icon || 'Tag' })
        .returning();

      // Toda categoria nasce com a subcategoria padrão "Geral"
      await tx
        .insert(subcategories)
        .values({ userId, name: 'Geral', categoryId: category.id });

      return category;
    });

    revalidatePath('/categories');
    revalidatePath('/'); // Dashboard onde tem formulário
    return { success: true, category: result };
  } catch (error) {
    console.error('Error creating category:', error);
    return { success: false, error: 'Failed to create category' };
  }
}

export async function createSubcategory(name: string, categoryId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const [subcategory] = await db.insert(subcategories).values({ userId, name, categoryId: Number(categoryId) }).returning();
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
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    await db.update(categories).set({ icon }).where(and(eq(categories.id, id), eq(categories.userId, userId)));
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
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    // 1. Check if category is linked to any transaction
    const linkedTransactions = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.categoryId, id), eq(transactions.userId, userId)))
      .limit(1);

    if (linkedTransactions.length > 0) {
      return { 
        success: false, 
        error: 'Esta categoria não pode ser excluída pois possui despesas/receitas vinculadas a ela.' 
      };
    }

    // 2. If no transactions are linked, we can delete the category.
    await db.transaction(async (tx) => {
      // First delete associated subcategories
      await tx.delete(subcategories).where(and(eq(subcategories.categoryId, id), eq(subcategories.userId, userId)));
      // Then delete the category
      await tx.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
    });

    revalidatePath('/categories');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: 'Falha ao excluir a categoria.' };
  }
}
