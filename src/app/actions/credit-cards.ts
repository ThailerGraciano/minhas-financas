'use server';

import { db } from '@/db';
import { creditCards } from '@/db/schema';
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
