'use server';

import { db } from '@/db';
import { categories, subcategories } from '@/db/schema';
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
