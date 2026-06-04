'use server';

import { db } from '@/db';
import { creditCards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getCreditCards() {
  return await db.select().from(creditCards);
}

export async function createCreditCard(data: typeof creditCards.$inferInsert) {
  try {
    await db.insert(creditCards).values(data);
    revalidatePath('/credit-cards');
    return { success: true };
  } catch (error) {
    console.error('Error creating credit card:', error);
    return { success: false, error: 'Failed to create credit card' };
  }
}

export async function getCreditCard(id: number) {
  const [card] = await db.select().from(creditCards).where(eq(creditCards.id, id));
  return card;
}

export async function updateCreditCard(id: number, data: Partial<typeof creditCards.$inferInsert>) {
  try {
    await db.update(creditCards).set(data).where(eq(creditCards.id, id));
    revalidatePath('/credit-cards');
    revalidatePath(`/credit-cards/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating credit card:', error);
    return { success: false, error: 'Failed to update credit card' };
  }
}
