'use server';

import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { addMonths, format, parseISO } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

type NewTransaction = typeof transactions.$inferInsert;

const transactionSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().refine((val) => Number(val) > 0, 'Valor deve ser maior que zero'),
  date: z.string().min(1, 'Data é obrigatória'),
  competencyMonth: z.string().min(1),
  categoryId: z.number().int().positive('Categoria é obrigatória'),
  type: z.string().min(1),
  status: z.string().min(1),
}).passthrough();

// Regra: receitas e despesas DEVEM ter subcategoria
const subcategoryRequiredTypes = ['income', 'expense', 'credit_card_expense'];

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
  // Validação Zod
  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Dados inválidos';
    return { success: false, error: firstError };
  }

  // Subcategoria obrigatória para receitas e despesas
  if (
    subcategoryRequiredTypes.includes(data.type) &&
    (!data.subcategoryId || data.subcategoryId <= 0)
  ) {
    return { success: false, error: 'Subcategoria é obrigatória para receitas e despesas' };
  }

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

export async function markTransactionAsPaid(id: string | number) {
  try {
    await db.update(transactions)
      .set({ status: 'paid' })
      .where(eq(transactions.id, Number(id)));
    
    revalidatePath('/transactions');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating transaction status:', error);
    return { success: false, error: 'Failed to update transaction' };
  }
}

export async function getCreditCardInvoices(creditCardId: number, month?: string) {
  const currentMonth = month || format(new Date(), 'yyyy-MM');
  
  return await db.query.transactions.findMany({
    where: (t, { eq, and }) => and(
      eq(t.creditCardId, creditCardId),
      eq(t.type, 'credit_card_expense'),
      eq(t.competencyMonth, currentMonth)
    ),
    with: {
      category: true,
      subcategory: true,
    },
    orderBy: (t, { desc }) => [desc(t.date)],
  });
}

export async function getCreditCardInvoiceMonths(creditCardId: number) {
  const txs = await db.query.transactions.findMany({
    where: (t, { eq, and }) => and(
      eq(t.creditCardId, creditCardId),
      eq(t.type, 'credit_card_expense')
    ),
    columns: { competencyMonth: true },
    orderBy: (t, { desc }) => [desc(t.competencyMonth)]
  });
  
  return [...new Set(txs.map(t => t.competencyMonth))];
}
