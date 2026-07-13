'use server';

import { db } from '@/db';
import { transactions, fixedTransactions, settings } from '@/db/schema';
import { eq, or, and, gte, lte } from 'drizzle-orm';
import { addMonths, subMonths, format, parseISO, endOfMonth, getDate } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';

type NewTransaction = typeof transactions.$inferInsert;
type CreateTransactionInput = Omit<NewTransaction, 'userId'> & { destinationAccountId?: number; isFixed?: boolean; isTotalAmount?: boolean; current_installment?: number };

function getCompetencyMonth(date: Date, closingDay: number): string {
  const day = getDate(date);
  if (day > closingDay) {
    return format(addMonths(date, 1), 'yyyy-MM');
  }
  return format(date, 'yyyy-MM');
}

const transactionSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().refine((val) => Number(val) > 0, 'Valor deve ser maior que zero'),
  date: z.string().min(1, 'Data é obrigatória'),
  competencyMonth: z.string().min(1),
  categoryId: z.number().int().positive('Categoria é obrigatória'),
  type: z.string().min(1),
  status: z.string().min(1),
  isTotalAmount: z.boolean().optional().default(false),
  installmentTotal: z.coerce.number().optional(),
  current_installment: z.coerce.number().min(1).default(1),
}).passthrough().superRefine((data, ctx) => {
  if (data.installmentTotal && data.current_installment > data.installmentTotal) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A parcela inicial não pode ser maior que o total de parcelas.',
      path: ['current_installment'],
    });
  }
});

const subcategoryRequiredTypes = ['income', 'expense', 'credit_card_expense'];

export async function getTransactions(month?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const currentMonth = month || format(new Date(), 'yyyy-MM');

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;

  const realTransactions = await db.query.transactions.findMany({
    where: and(eq(transactions.competencyMonth, currentMonth), eq(transactions.userId, userId)),
    with: {
      account: true,
      category: true,
      creditCard: true,
    },
    orderBy: (t, { desc }) => [desc(t.date)],
  });

  const monthDate = parseISO(`${currentMonth}-01`);
  const lastDayOfMonth = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  const activeFixedTxs = await db.query.fixedTransactions.findMany({
    where: and(
      eq(fixedTransactions.active, true),
      lte(fixedTransactions.startDate, lastDayOfMonth),
      eq(fixedTransactions.userId, userId)
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
      const dayNum = parseInt(dayStr, 10);
      
      let targetMonthDate = new Date(monthDate);
      if (dayNum > closingDay) {
        targetMonthDate = subMonths(targetMonthDate, 1);
      }

      const targetDate = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), dayNum);
      const finalDate = targetDate.getMonth() !== targetMonthDate.getMonth()
        ? endOfMonth(targetMonthDate)
        : targetDate;
      const dateStr = format(finalDate, 'yyyy-MM-dd');

      if (dateStr < ft.startDate) return null;

      const tempId = -Math.floor(Math.random() * 1000000) - 1;

      return {
        id: tempId,
        userId: userId,
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
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const allTransactions = [...realTransactions, ...virtualTransactions];

  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return allTransactions;
}

export async function createTransaction(data: CreateTransactionInput): Promise<{ success: boolean; parentId?: number; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Dados inválidos';
    return { success: false, error: firstError };
  }

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;
  const parsedDate = parseISO(data.date);
  data.competencyMonth = getCompetencyMonth(parsedDate, closingDay);

  if (
    subcategoryRequiredTypes.includes(data.type) &&
    (!data.subcategoryId || data.subcategoryId <= 0)
  ) {
    return { success: false, error: 'Subcategoria é obrigatória para receitas e despesas' };
  }

  try {
    const { isFixed, destinationAccountId, isTotalAmount, current_installment, ...txData } = data;

    if (txData.type === 'transfer' && destinationAccountId) {
      const result = await db.transaction(async (tx) => {
        const [originTx] = await tx.insert(transactions).values({
          ...txData,
          userId,
          description: `${txData.description} (Saída)`,
        }).returning();

        await tx.insert(transactions).values({
          ...txData,
          userId,
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
          userId,
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
            userId,
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

      const currentInstallment = current_installment || 1;

      const [parentTx] = await db.insert(transactions).values({
        ...txData,
        description: `${txData.description} (${currentInstallment}/${txData.installmentTotal})`,
        userId,
        amount: currentInstallment === txData.installmentTotal ? lastParcelAmount : baseParcelAmount,
        installmentCurrent: currentInstallment,
      }).returning();

      const installmentsToInsert: NewTransaction[] = [];
      const baseDate = parseISO(data.date);

      for (let i = currentInstallment + 1; i <= txData.installmentTotal; i++) {
        const nextDate = addMonths(baseDate, i - currentInstallment);
        const isLast = i === txData.installmentTotal;

        installmentsToInsert.push({
          ...txData,
          description: `${txData.description} (${i}/${txData.installmentTotal})`,
          userId,
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
      await db.insert(transactions).values({ ...txData, userId });

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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  return await db.transaction(async (tx) => {
    const [transactionItem] = await tx.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    if (!transactionItem) {
      throw new Error('Transação não encontrada');
    }

    if (transactionItem.status === newStatus) {
      return { success: true };
    }

    if (transactionItem.type === 'transfer') {
      const otherTx = transactionItem.parentTransactionId
        ? await tx.query.transactions.findFirst({ where: and(eq(transactions.id, transactionItem.parentTransactionId), eq(transactions.userId, userId)) })
        : await tx.query.transactions.findFirst({ where: and(eq(transactions.parentTransactionId, transactionItem.id), eq(transactions.userId, userId)) });

      const originTx = transactionItem.parentTransactionId ? otherTx : transactionItem;
      const destTx = transactionItem.parentTransactionId ? transactionItem : otherTx;

      if (originTx && destTx) {
        await tx.update(transactions).set({ status: newStatus }).where(eq(transactions.id, originTx.id));
        await tx.update(transactions).set({ status: newStatus }).where(eq(transactions.id, destTx.id));
      } else {
        await tx.update(transactions).set({ status: newStatus }).where(eq(transactions.id, id));
      }
    } else {
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
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    await db.insert(transactions).values({
      userId,
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
      fixedTransactionId: txData.fixedTransactionId || null,
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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const currentMonth = month || format(new Date(), 'yyyy-MM');

  return await db.query.transactions.findMany({
    where: (t, { eq, and }) => and(
      eq(t.creditCardId, creditCardId),
      eq(t.type, 'credit_card_expense'),
      eq(t.competencyMonth, currentMonth),
      eq(t.userId, userId)
    ),
    with: {
      category: true,
      subcategory: true,
    },
    orderBy: (t, { desc }) => [desc(t.date)],
  });
}

export async function getCreditCardInvoiceMonths(creditCardId: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const txs = await db.query.transactions.findMany({
    where: (t, { eq, and }) => and(
      eq(t.creditCardId, creditCardId),
      eq(t.type, 'credit_card_expense'),
      eq(t.userId, userId)
    ),
    columns: { competencyMonth: true },
    orderBy: (t, { desc }) => [desc(t.competencyMonth)]
  });

  return [...new Set(txs.map(t => t.competencyMonth))];
}

export async function deleteTransaction(id: number, mode: 'single' | 'future' = 'single') {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const result = await db.transaction(async (tx) => {
      const [transactionItem] = await tx.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
      if (!transactionItem) {
        return { success: true };
      }

      if (mode === 'future') {
        const parentId = transactionItem.parentTransactionId || transactionItem.id;
        const targetDate = transactionItem.date;

        const txsToDelete = await tx.select()
          .from(transactions)
          .where(
            and(
              or(
                eq(transactions.parentTransactionId, parentId),
                eq(transactions.id, parentId),
                transactionItem.fixedTransactionId ? eq(transactions.fixedTransactionId, transactionItem.fixedTransactionId) : undefined
              ),
              gte(transactions.date, targetDate),
              eq(transactions.userId, userId)
            )
          );

        const idsToDelete = txsToDelete.map(t => t.id);
        for (const targetId of idsToDelete) {
          await tx.delete(transactions).where(eq(transactions.id, targetId));
        }
      } else {
        if (transactionItem.type === 'transfer') {
          const otherTx = transactionItem.parentTransactionId
            ? await tx.query.transactions.findFirst({ where: and(eq(transactions.id, transactionItem.parentTransactionId), eq(transactions.userId, userId)) })
            : await tx.query.transactions.findFirst({ where: and(eq(transactions.parentTransactionId, transactionItem.id), eq(transactions.userId, userId)) });

          await tx.delete(transactions).where(eq(transactions.id, transactionItem.id));
          if (otherTx) {
            await tx.delete(transactions).where(eq(transactions.id, otherTx.id));
          }
        } else {
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

export async function updateTransaction(id: number, inputData: Partial<CreateTransactionInput> & { destinationAccountId?: number }): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
    const closingDay = appSettings?.closingDay || 25;

    if (inputData.date) {
      const parsedDate = parseISO(inputData.date);
      inputData.competencyMonth = getCompetencyMonth(parsedDate, closingDay);
    }

    const result = await db.transaction(async (tx) => {
      const [oldTx] = await tx.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
      if (!oldTx) {
        throw new Error('Transação não encontrada');
      }

      const { destinationAccountId, ...data } = inputData;

      if (oldTx.type === 'transfer') {
        const otherTx = oldTx.parentTransactionId
          ? await tx.query.transactions.findFirst({ where: and(eq(transactions.id, oldTx.parentTransactionId), eq(transactions.userId, userId)) })
          : await tx.query.transactions.findFirst({ where: and(eq(transactions.parentTransactionId, oldTx.id), eq(transactions.userId, userId)) });

        await tx.update(transactions).set(data).where(eq(transactions.id, id));

        if (otherTx) {
          const otherUpdateData: Partial<NewTransaction> = {};
          if (data.amount !== undefined) otherUpdateData.amount = data.amount;
          if (data.date !== undefined) otherUpdateData.date = data.date;
          if (data.competencyMonth !== undefined) otherUpdateData.competencyMonth = data.competencyMonth;
          if (data.status !== undefined) otherUpdateData.status = data.status;
          if (data.description !== undefined) {
            const suffix = otherTx.parentTransactionId ? ' (Entrada)' : ' (Saída)';
            const cleanDesc = data.description.replace(/\s*\(Saída\)|\s*\(Entrada\)/g, '');
            otherUpdateData.description = `${cleanDesc}${suffix}`;
          }
          if (destinationAccountId !== undefined) {
            otherUpdateData.accountId = destinationAccountId;
          }
          if (Object.keys(otherUpdateData).length > 0) {
            await tx.update(transactions).set(otherUpdateData).where(eq(transactions.id, otherTx.id));
          }
        }
      } else {
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

export async function getTransactionDetailsForEdit(id: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [tx] = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  if (!tx) return null;

  let destinationAccountId: number | null = null;
  if (tx.type === 'transfer') {
    const otherTx = tx.parentTransactionId
      ? await db.query.transactions.findFirst({ where: and(eq(transactions.id, tx.parentTransactionId), eq(transactions.userId, userId)) })
      : await db.query.transactions.findFirst({ where: and(eq(transactions.parentTransactionId, tx.id), eq(transactions.userId, userId)) });
    
    if (tx.parentTransactionId) {
      destinationAccountId = tx.accountId;
      return { ...tx, accountId: otherTx?.accountId ?? null, destinationAccountId };
    } else {
      destinationAccountId = otherTx?.accountId ?? null;
      return { ...tx, destinationAccountId };
    }
  }

  return tx;
}
