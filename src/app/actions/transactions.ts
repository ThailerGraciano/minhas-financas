'use server';

import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { addMonths, format, parseISO } from 'date-fns';

type NewTransaction = typeof transactions.$inferInsert;

export async function createTransaction(data: NewTransaction) {
  try {
    if (data.installmentTotal && data.installmentTotal > 1) {
      // Create the first transaction to be the parent
      const [parentTx] = await db.insert(transactions).values({
        ...data,
        installmentCurrent: 1,
      }).returning();

      const installmentsToInsert: NewTransaction[] = [];
      // Assume date is a string in YYYY-MM-DD format
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

      return { success: true, parentId: parentTx.id };
    } else {
      // Single transaction
      await db.insert(transactions).values(data);
      return { success: true };
    }
  } catch (error) {
    console.error('Error creating transaction:', error);
    return { success: false, error: 'Failed to create transaction' };
  }
}

export async function markTransactionAsPaid(id: string | number) {
  try {
    await db.update(transactions)
      .set({ status: 'paid' })
      .where(eq(transactions.id, Number(id)));
    
    return { success: true };
  } catch (error) {
    console.error('Error updating transaction status:', error);
    return { success: false, error: 'Failed to update transaction' };
  }
}
