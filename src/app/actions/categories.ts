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
    with: { 
      subcategories: {
        orderBy: (subcategories, { asc }) => [asc(subcategories.name)]
      }
    },
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

export async function toggleCategoryPrediction(categoryId: number, isPredictable: boolean) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    await db.transaction(async (tx) => {
      await tx.update(categories)
        .set({ isPredictable })
        .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
      
      await tx.update(subcategories)
        .set({ isPredictable })
        .where(and(eq(subcategories.categoryId, categoryId), eq(subcategories.userId, userId)));
    });

    revalidatePath('/categories');
    revalidatePath('/planning');
    return { success: true };
  } catch (error) {
    console.error('Error toggling category prediction:', error);
    return { success: false, error: 'Falha ao atualizar a previsão da categoria.' };
  }
}

export async function toggleSubcategoryPrediction(subcategoryId: number, isPredictable: boolean) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    await db.update(subcategories)
      .set({ isPredictable })
      .where(and(eq(subcategories.id, subcategoryId), eq(subcategories.userId, userId)));

    revalidatePath('/categories');
    revalidatePath('/planning');
    return { success: true };
  } catch (error) {
    console.error('Error toggling subcategory prediction:', error);
    return { success: false, error: 'Falha ao atualizar a previsão da subcategoria.' };
  }
}

export async function updateCategoryName(id: number, name: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    await db.update(categories)
      .set({ name })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));
    
    revalidatePath('/categories');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating category name:', error);
    return { success: false, error: 'Falha ao atualizar o nome da categoria.' };
  }
}

export async function updateSubcategoryName(id: number, name: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    await db.update(subcategories)
      .set({ name })
      .where(and(eq(subcategories.id, id), eq(subcategories.userId, userId)));
    
    revalidatePath('/categories');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating subcategory name:', error);
    return { success: false, error: 'Falha ao atualizar o nome da subcategoria.' };
  }
}

export async function deleteSubcategory(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    // Check if subcategory is linked to any transaction
    const linkedTransactions = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.subcategoryId, id), eq(transactions.userId, userId)))
      .limit(1);

    if (linkedTransactions.length > 0) {
      return { 
        success: false, 
        error: 'Esta subcategoria não pode ser excluída pois possui despesas/receitas vinculadas a ela.' 
      };
    }

    await db.delete(subcategories).where(and(eq(subcategories.id, id), eq(subcategories.userId, userId)));

    revalidatePath('/categories');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return { success: false, error: 'Falha ao excluir a subcategoria.' };
  }
}
