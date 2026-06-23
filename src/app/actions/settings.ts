'use server';

import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export async function updateClosingDay(closingDay: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const existing = await db.select().from(settings).where(eq(settings.userId, userId));
    
    if (existing.length === 0) {
      await db.insert(settings).values({ userId, closingDay });
    } else {
      await db.update(settings).set({ closingDay }).where(eq(settings.userId, userId));
    }
    
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating closing day:', error);
    return { success: false, error: 'Failed to update settings' };
  }
}

export async function getSettings() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const result = await db.select().from(settings).where(eq(settings.userId, userId));
  return result[0] || { closingDay: 1 };
}
