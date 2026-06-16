'use server';

import { db } from '@/db';
import { transactions, fixedTransactions } from '@/db/schema';
import { eq, or, and, gte, lte } from 'drizzle-orm';
import { addMonths, format, parseISO, endOfMonth } from 'date-fns';
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
  isTotalAmount: z.boolean().optional().default(false),
}).passthrough();

// Regra: receitas e despesas DEVEM ter subcategoria
const subcategoryRequiredTypes = ['income', 'expense', 'credit_card_expense'];

export async function getTransactions(month?: string) {
  const currentMonth = month || format(new Date(), 'yyyy-MM');

  // Consulta A: Transações normais do mês
  const realTransactions = await db.query.transactions.findMany({
    where: eq(transactions.competencyMonth, currentMonth),
    with: {
      account: true,
      category: true,
      creditCard: true,
    },
    orderBy: (t, { desc }) => [desc(t.date)],
  });

  const monthDate = parseISO(`${currentMonth}-01`);
  const lastDayOfMonth = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  // Consulta B: Transações fixas ativas e já iniciadas
  const activeFixedTxs = await db.query.fixedTransactions.findMany({
    where: and(
      eq(fixedTransactions.active, true),
      lte(fixedTransactions.startDate, lastDayOfMonth)
    ),
    with: {
      account: true,
      category: true,
      creditCard: true,
    }
  });

  const materializedFixedIds = new Set(
    realTransactions
      .filter(t => t.fixedTransactionId)
      .map(t => t.fixedTransactionId)
  );

  const virtualTransactions = activeFixedTxs
    .filter(ft => !materializedFixedIds.has(ft.id))
    .map(ft => {
      const dayStr = ft.startDate.split('-')[2];
      const targetDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), parseInt(dayStr));
      const finalDate = targetDate.getMonth() !== monthDate.getMonth()
        ? endOfMonth(monthDate)
        : targetDate;
      const dateStr = format(finalDate, 'yyyy-MM-dd');

      const tempId = -Math.floor(Math.random() * 1000000) - 1;

      return {
        id: tempId,
        type: ft.type,
        accountId: ft.accountId,
        creditCardId: ft.creditCardId,
        categoryId: ft.categoryId,
        subcategoryId: ft.subcategoryId,
        amount: ft.amount,
        description: ft.description,
        date: dateStr,
        competencyMonth: currentMonth,
        status: 'pending',
        isFixed: false,
        fixedTransactionId: ft.id,
        installmentCurrent: null,
        installmentTotal: null,
        parentTransactionId: null,
        observations: null,
        paidAt: null,
        account: ft.account,
        category: ft.category,
        creditCard: ft.creditCard,
      } as typeof realTransactions[0];
    });

  const allTransactions = [...realTransactions, ...virtualTransactions];

  // Ordena por data (descendente)
  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return allTransactions;
}

export async function createTransaction(data: NewTransaction & { destinationAccountId?: number; isFixed?: boolean; isTotalAmount?: boolean }): Promise<{ success: boolean; parentId?: number; error?: string }> {
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
    const { isFixed, destinationAccountId, isTotalAmount, ...txData } = data;

    if (txData.type === 'transfer' && destinationAccountId) {
      const result = await db.transaction(async (tx) => {
        // 1. Insert origin transaction (Saída)
        const [originTx] = await tx.insert(transactions).values({
          ...txData,
          description: `${txData.description} (Saída)`,
        }).returning();

        // 2. Insert destination transaction (Entrada)
        await tx.insert(transactions).values({
          ...txData,
          accountId: destinationAccountId,
          description: `${txData.description} (Entrada)`,
          parentTransactionId: originTx.id,
        });

        return { success: true, parentId: originTx.id };
      });

      revalidatePath('/transactions');
      revalidatePath('/');
      revalidatePath('/planning');
      return result;
    }

    if (isFixed) {
      const result = await db.transaction(async (tx) => {
        const [fixedTx] = await tx.insert(fixedTransactions).values({
          type: txData.type,
          accountId: txData.accountId!,
          creditCardId: txData.creditCardId || null,
          categoryId: txData.categoryId,
          subcategoryId: txData.subcategoryId || null,
          amount: txData.amount,
          description: txData.description,
          startDate: txData.date,
          active: true,
        }).returning();

        const installmentsToInsert: NewTransaction[] = [];
        const baseDate = parseISO(txData.date);

        for (let i = 0; i < 12; i++) {
          const nextDate = addMonths(baseDate, i);

          installmentsToInsert.push({
            ...txData,
            date: format(nextDate, 'yyyy-MM-dd'),
            competencyMonth: format(nextDate, 'yyyy-MM'),
            status: i === 0 ? (txData.status || 'pending') : 'pending',
            fixedTransactionId: fixedTx.id,
          });
        }

        await tx.insert(transactions).values(installmentsToInsert);

        return { success: true };
      });

      revalidatePath('/transactions');
      revalidatePath('/');
      revalidatePath('/planning');
      return result;
    }

    if (txData.installmentTotal && txData.installmentTotal > 1) {
      let baseParcelAmount = txData.amount;
      let lastParcelAmount = txData.amount;

      if (isTotalAmount) {
        const total = Number(txData.amount);
        const installmentValue = Math.round((total / txData.installmentTotal) * 100) / 100;
        baseParcelAmount = installmentValue.toFixed(2);
        
        const sumWithoutLast = installmentValue * (txData.installmentTotal - 1);
        const lastValue = Math.round((total - sumWithoutLast) * 100) / 100;
        lastParcelAmount = lastValue.toFixed(2);
      }

      const [parentTx] = await db.insert(transactions).values({
        ...txData,
        amount: baseParcelAmount,
        installmentCurrent: 1,
      }).returning();

      const installmentsToInsert: NewTransaction[] = [];
      const baseDate = parseISO(data.date);

      for (let i = 2; i <= txData.installmentTotal; i++) {
        const nextDate = addMonths(baseDate, i - 1);
        const isLast = i === txData.installmentTotal;

        installmentsToInsert.push({
          ...txData,
          amount: isLast ? lastParcelAmount : baseParcelAmount,
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
      revalidatePath('/planning');
      return { success: true, parentId: parentTx.id };
    } else {
      await db.insert(transactions).values(txData);

      revalidatePath('/transactions');
      revalidatePath('/');
      revalidatePath('/planning');
      return { success: true };
    }
  } catch (error) {
    console.error('Error creating transaction:', error);
    return { success: false, error: 'Failed to create transaction' };
  }
}

async function changeTransactionStatus(id: number, newStatus: 'paid' | 'pending') {
  return await db.transaction(async (tx) => {
    // 1. Get the transaction
    const [transactionItem] = await tx.select().from(transactions).where(eq(transactions.id, id));
    if (!transactionItem) {
      throw new Error('Transação não encontrada');
    }

    if (transactionItem.status === newStatus) {
      return { success: true }; // No change
    }

    if (transactionItem.type === 'transfer') {
      // Find the pair
      const otherTx = transactionItem.parentTransactionId
        ? await tx.query.transactions.findFirst({ where: eq(transactions.id, transactionItem.parentTransactionId) })
        : await tx.query.transactions.findFirst({ where: eq(transactions.parentTransactionId, transactionItem.id) });

      // Determine origin and destination
      const originTx = transactionItem.parentTransactionId ? otherTx : transactionItem;
      const destTx = transactionItem.parentTransactionId ? transactionItem : otherTx;

      if (originTx && destTx) {
        // The trigger handles balance changes; we only need to update the status.
        await tx.update(transactions).set({ status: newStatus }).where(eq(transactions.id, originTx.id));
        await tx.update(transactions).set({ status: newStatus }).where(eq(transactions.id, destTx.id));
      } else {
        await tx.update(transactions).set({ status: newStatus }).where(eq(transactions.id, id));
      }
    } else {
      // Normal transaction (income, expense, credit_card_expense).
      // The trigger handles the balance update automatically on UPDATE.
      await tx.update(transactions).set({ status: newStatus }).where(eq(transactions.id, id));
    }

    return { success: true };
  });
}

export async function markTransactionAsPaid(id: string | number) {
  try {
    const result = await changeTransactionStatus(Number(id), 'paid');
    revalidatePath('/transactions');
    revalidatePath('/');
    revalidatePath('/planning');
    revalidatePath('/credit-cards');
    return result;
  } catch (error) {
    console.error('Error marking transaction as paid:', error);
    return { success: false, error: 'Failed to update transaction' };
  }
}

export async function toggleTransactionStatus(id: string | number, currentStatus: string): Promise<{ success: boolean; newStatus?: string; error?: string }> {
  try {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    const result = await changeTransactionStatus(Number(id), newStatus);

    revalidatePath('/transactions');
    revalidatePath('/');
    revalidatePath('/planning');
    revalidatePath('/credit-cards');
    return { ...result, newStatus };
  } catch (error) {
    console.error('Error toggling transaction status:', error);
    return { success: false, error: 'Failed to toggle transaction status' };
  }
}

export async function payVirtualTransaction(txData: {
  type: string;
  accountId: number | null;
  creditCardId: number | null;
  categoryId: number;
  subcategoryId: number | null;
  amount: string;
  description: string;
  date: string;
  competencyMonth: string;
  fixedTransactionId: string | null;
}) {
  try {
    await db.insert(transactions).values({
      type: txData.type,
      accountId: txData.accountId,
      creditCardId: txData.creditCardId,
      categoryId: txData.categoryId,
      subcategoryId: txData.subcategoryId,
      amount: txData.amount,
      description: txData.description,
      date: txData.date,
      competencyMonth: txData.competencyMonth,
      status: 'paid',
      paidAt: new Date(),
      fixedTransactionId: txData.fixedTransactionId,
    });

    revalidatePath('/transactions');
    revalidatePath('/');
    revalidatePath('/planning');
    revalidatePath('/credit-cards');
    return { success: true };
  } catch (error) {
    console.error('Error paying virtual transaction:', error);
    return { success: false, error: 'Failed to pay virtual transaction' };
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

export async function deleteTransaction(id: number, mode: 'single' | 'future' = 'single') {
  try {
    const result = await db.transaction(async (tx) => {
      const [transactionItem] = await tx.select().from(transactions).where(eq(transactions.id, id));
      if (!transactionItem) {
        return { success: true }; // Already deleted
      }

      if (mode === 'future') {
        const parentId = transactionItem.parentTransactionId || transactionItem.id;
        const targetDate = transactionItem.date;

        // Fetch all transactions in the series that are on or after the target date
        const txsToDelete = await tx.select()
          .from(transactions)
          .where(
            and(
              or(
                eq(transactions.parentTransactionId, parentId),
                eq(transactions.id, parentId),
                transactionItem.fixedTransactionId ? eq(transactions.fixedTransactionId, transactionItem.fixedTransactionId) : undefined
              ),
              gte(transactions.date, targetDate)
            )
          );

        // Delete all matched transactions.
        // The trigger handles balance reversion automatically for each DELETE.
        const idsToDelete = txsToDelete.map(t => t.id);
        for (const targetId of idsToDelete) {
          await tx.delete(transactions).where(eq(transactions.id, targetId));
        }
      } else {
        // mode === 'single'
        if (transactionItem.type === 'transfer') {
          // Find the pair
          const otherTx = transactionItem.parentTransactionId
            ? await tx.query.transactions.findFirst({ where: eq(transactions.id, transactionItem.parentTransactionId) })
            : await tx.query.transactions.findFirst({ where: eq(transactions.parentTransactionId, transactionItem.id) });

          // Delete both. The trigger handles balance reversion for each DELETE.
          await tx.delete(transactions).where(eq(transactions.id, transactionItem.id));
          if (otherTx) {
            await tx.delete(transactions).where(eq(transactions.id, otherTx.id));
          }
        } else {
          // Normal transaction. The trigger handles balance reversion automatically.
          await tx.delete(transactions).where(eq(transactions.id, id));
        }
      }

      return { success: true };
    });

    revalidatePath('/transactions');
    revalidatePath('/');
    revalidatePath('/planning');
    revalidatePath('/credit-cards');
    return result;
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return { success: false, error: 'Failed to delete transaction' };
  }
}

export async function updateTransaction(id: number, data: Partial<NewTransaction>): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await db.transaction(async (tx) => {
      const [oldTx] = await tx.select().from(transactions).where(eq(transactions.id, id));
      if (!oldTx) {
        throw new Error('Transação não encontrada');
      }

      if (oldTx.type === 'transfer') {
        const otherTx = oldTx.parentTransactionId
          ? await tx.query.transactions.findFirst({ where: eq(transactions.id, oldTx.parentTransactionId) })
          : await tx.query.transactions.findFirst({ where: eq(transactions.parentTransactionId, oldTx.id) });

        // Update this transaction. The trigger handles the balance delta automatically.
        await tx.update(transactions).set(data).where(eq(transactions.id, id));

        // Update the paired transfer transaction with matching fields
        if (otherTx) {
          const otherUpdateData: Partial<NewTransaction> = {};
          if (data.amount !== undefined) otherUpdateData.amount = data.amount;
          if (data.date !== undefined) otherUpdateData.date = data.date;
          if (data.competencyMonth !== undefined) otherUpdateData.competencyMonth = data.competencyMonth;
          if (data.status !== undefined) otherUpdateData.status = data.status;
          if (data.description !== undefined) {
            // Keep the (Saída) / (Entrada) suffix accordingly
            const suffix = otherTx.parentTransactionId ? ' (Entrada)' : ' (Saída)';
            const cleanDesc = data.description.replace(/\s*\(Saída\)|\s*\(Entrada\)/g, '');
            otherUpdateData.description = `${cleanDesc}${suffix}`;
          }
          if (Object.keys(otherUpdateData).length > 0) {
            await tx.update(transactions).set(otherUpdateData).where(eq(transactions.id, otherTx.id));
          }
        }
      } else {
        // Normal transaction update. The trigger handles the balance delta automatically.
        await tx.update(transactions).set(data).where(eq(transactions.id, id));
      }

      return { success: true };
    });

    revalidatePath('/transactions');
    revalidatePath('/');
    revalidatePath('/planning');
    revalidatePath('/credit-cards');
    return result;
  } catch (error) {
    console.error('Error updating transaction:', error);
    return { success: false, error: 'Failed to update transaction' };
  }
}
