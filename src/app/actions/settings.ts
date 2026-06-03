'use server';

import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateClosingDay(closingDay: number) {
  try {
    // Como é um app de uso pessoal, assumimos apenas um registro de configurações com id = 1
    const existing = await db.select().from(settings).where(eq(settings.id, 1));
    
    if (existing.length === 0) {
      await db.insert(settings).values({ id: 1, closingDay });
    } else {
      await db.update(settings).set({ closingDay }).where(eq(settings.id, 1));
    }
    
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating closing day:', error);
    return { success: false, error: 'Failed to update settings' };
  }
}

export async function getSettings() {
  const result = await db.select().from(settings).where(eq(settings.id, 1));
  return result[0] || { closingDay: 25 };
}
