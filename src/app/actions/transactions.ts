'use server';

import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { addMonths, format, parseISO } from 'date-fns';
import { revalidatePath } from 'next/cache';

type NewTransaction = typeof transactions.$inferInsert;

export async function getTransactions(month?: string) {
  const currentMonth = month || format(new Date(), 'yyyy-MM');
  
  return await db.query.transactions.findMany({
    where: eq(transactions.competencyMonth, currentMonth),
    with: {
      account: true,
      category: true,
      creditCard: true,
    },
    orderBy: (t, { desc }) => [desc(t.date)],
  });
}

export async function createTransaction(data: NewTransaction) {
  try {
    if (data.installmentTotal && data.installmentTotal > 1) {
      const [parentTx] = await db.insert(transactions).values({
        ...data,
        installmentCurrent: 1,
      }).returning();

      const installmentsToInsert: NewTransaction[] = [];
      const baseDate = parseISO(data.date);

      for (let i = 2; i <= data.installmentTotal; i++) {
        const nextDate = addMonths(baseDate, i - 1);
        
        installmentsToInsert.push({
          ...data,
          date: format(nextDate, 'yyyy-MM-dd'),
          competencyMonth: format(nextDate, 'yyyy-MM'),
          installmentCurrent: i,
          parentTransactionId: parentTx.id,
        });
      }

      if (installmentsToInsert.length > 0) {
        await db.insert(transactions).values(installmentsToInsert);
      }

      revalidatePath('/transactions');
      revalidatePath('/');
      return { success: true, parentId: parentTx.id };
    } else {
      await db.insert(transactions).values(data);
      revalidatePath('/transactions');
      revalidatePath('/');
      return { success: true };
    }
  } catch (error) {
    console.error('Error creating transaction:', error);
    return { success: false, error: 'Failed to create transaction' };
  }
}

export async function markTransactionAsPaid(id: number) {
  try {
    await db.update(transactions)
      .set({ status: 'paid' })
      .where(eq(transactions.id, id));
    
    revalidatePath('/transactions');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating transaction status:', error);
    return { success: false, error: 'Failed to update transaction' };
  }
}
