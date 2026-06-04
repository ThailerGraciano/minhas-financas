'use server';

import { db } from '@/db';
import { accounts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getAccounts() {
  return await db.select().from(accounts);
}

export async function createAccount(data: typeof accounts.$inferInsert) {
  try {
    await db.insert(accounts).values(data);
    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    console.error('Error creating account:', error);
    return { success: false, error: 'Failed to create account' };
  }
}

export async function updateAccount(id: number, data: Partial<typeof accounts.$inferInsert>) {
  try {
    await db.update(accounts).set(data).where(eq(accounts.id, id));
    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    console.error('Error updating account:', error);
    return { success: false, error: 'Failed to update account' };
  }
}
