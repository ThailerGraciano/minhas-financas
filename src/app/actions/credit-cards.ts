'use server';

import { db } from '@/db';
import { creditCards, transactions, accounts, categories, subcategories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { auth } from '@/auth';

export async function getCreditCards() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return await db.select().from(creditCards).where(eq(creditCards.userId, session.user.id));
}

export async function createCreditCard(data: Omit<typeof creditCards.$inferInsert, 'userId'>) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    await db.insert(creditCards).values({ ...data, userId: session.user.id });
    revalidatePath('/credit-cards');
    return { success: true };
  } catch (error) {
    console.error('Error creating credit card:', error);
    return { success: false, error: 'Failed to create credit card' };
  }
}

export async function getCreditCard(id: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const [card] = await db.select().from(creditCards).where(and(eq(creditCards.id, id), eq(creditCards.userId, session.user.id)));
  return card;
}

export async function updateCreditCard(id: number, data: Partial<typeof creditCards.$inferInsert>) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    await db.update(creditCards).set(data).where(and(eq(creditCards.id, id), eq(creditCards.userId, session.user.id)));
    revalidatePath('/credit-cards');
    revalidatePath(`/credit-cards/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating credit card:', error);
    return { success: false, error: 'Failed to update credit card' };
  }
}

export async function deleteCreditCard(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const linkedTxs = await db.select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.creditCardId, id), eq(transactions.userId, userId)))
      .limit(1);

    if (linkedTxs.length > 0) {
      return { success: false, error: 'Não é possível excluir: existem transações vinculadas a este cartão.' };
    }

    await db.delete(creditCards).where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)));
    revalidatePath('/credit-cards');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting credit card:', error);
    return { success: false, error: 'Falha ao excluir cartão de crédito' };
  }
}

export async function getInvoiceSummary(creditCardId: string | number, competencyMonth: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;
  const parsedId = Number(creditCardId);
  const cardTransactions = await db.query.transactions.findMany({
    where: (t, { eq, and }) => and(
      eq(t.creditCardId, parsedId),
      eq(t.competencyMonth, competencyMonth),
      eq(t.type, 'credit_card_expense'),
      eq(t.userId, userId)
    ),
    with: {
      category: true,
      subcategory: true,
    },
    orderBy: (t, { desc }) => [desc(t.date)],
  });

  const summary = cardTransactions.reduce(
    (acc, transaction) => {
      const amount = Number(transaction.amount);
      acc.total_amount += amount;
      if (transaction.status === 'paid') {
        acc.paid_amount += amount;
      } else if (transaction.status === 'pending') {
        acc.pending_amount += amount;
      }
      return acc;
    },
    { total_amount: 0, paid_amount: 0, pending_amount: 0 }
  );

  return {
    ...summary,
    transactions: cardTransactions,
  };
}

export async function payFullInvoice(
  creditCardId: string | number,
  competencyMonth: string,
  accountId: string | number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;
  const parsedCardId = Number(creditCardId);
  const parsedAccountId = Number(accountId);

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Get pending amount
      const cardTransactions = await tx.select()
        .from(transactions)
        .where(
          and(
            eq(transactions.creditCardId, parsedCardId),
            eq(transactions.competencyMonth, competencyMonth),
            eq(transactions.type, 'credit_card_expense'),
            eq(transactions.userId, userId)
          )
        );

      let pendingAmount = 0;
      for (const t of cardTransactions) {
        if (t.status === 'pending') {
          pendingAmount += Number(t.amount);
        }
      }

      if (pendingAmount <= 0) {
        throw new Error('Não há valor pendente para pagar nesta fatura');
      }

      // 2. Update transactions to 'paid'
      await tx.update(transactions)
        .set({ status: 'paid' })
        .where(
          and(
            eq(transactions.creditCardId, parsedCardId),
            eq(transactions.competencyMonth, competencyMonth),
            eq(transactions.type, 'credit_card_expense'),
            eq(transactions.status, 'pending'),
            eq(transactions.userId, userId)
          )
        );

      // 3. Find or create Category for "Pagamento de Fatura"
      let category = await tx.query.categories.findFirst({
        where: (categories, { eq, and }) => and(eq(categories.name, 'Pagamento de Fatura'), eq(categories.userId, userId))
      });
      let subcategoryId = null;

      if (!category) {
        const [newCategory] = await tx.insert(categories)
          .values({ userId, name: 'Pagamento de Fatura', type: 'expense', icon: 'CreditCard' })
          .returning();
        
        const [newSubcategory] = await tx.insert(subcategories)
          .values({ userId, name: 'Geral', categoryId: newCategory.id })
          .returning();
          
        category = newCategory;
        subcategoryId = newSubcategory.id;
      } else {
        const subcategory = await tx.query.subcategories.findFirst({
          where: (subcategories, { eq, and }) => and(eq(subcategories.categoryId, category!.id), eq(subcategories.userId, userId))
        });
        subcategoryId = subcategory?.id || null;
        
        if (!subcategoryId) {
          const [newSubcategory] = await tx.insert(subcategories)
            .values({ userId, name: 'Geral', categoryId: category.id })
            .returning();
          subcategoryId = newSubcategory.id;
        }
      }

      // 4. Create the transfer transaction for the payment (avoids double counting in expenses)
      await tx.insert(transactions).values({
        userId,
        type: 'transfer',
        accountId: parsedAccountId,
        categoryId: category.id,
        subcategoryId: subcategoryId,
        amount: pendingAmount.toString(),
        description: `Pagamento de Fatura - ${competencyMonth}`,
        date: format(new Date(), 'yyyy-MM-dd'),
        competencyMonth: competencyMonth,
        status: 'paid',
      });

      // 5. Deduct from account balance
      const [account] = await tx.select().from(accounts).where(and(eq(accounts.id, parsedAccountId), eq(accounts.userId, userId)));
      if (account) {
        const newBalance = Number(account.currentBalance) - pendingAmount;
        await tx.update(accounts)
          .set({ currentBalance: newBalance.toString() })
          .where(and(eq(accounts.id, parsedAccountId), eq(accounts.userId, userId)));
      }

      return { success: true };
    });

    revalidatePath('/credit-cards');
    revalidatePath(`/credit-cards/${parsedCardId}`);
    revalidatePath('/dashboard');
    revalidatePath('/transactions');
    return result;
  } catch (error) {
    console.error('Error paying full invoice:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Falha ao pagar fatura' };
  }
}

export async function getCreditCardsWithSummary(competencyMonth: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const cards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));

  const cardsWithSummary = await Promise.all(
    cards.map(async (card) => {
      // Busca transações do cartão na competência informada
      const cardTxs = await db.select()
        .from(transactions)
        .where(
          and(
            eq(transactions.creditCardId, card.id),
            eq(transactions.competencyMonth, competencyMonth),
            eq(transactions.type, 'credit_card_expense'),
            eq(transactions.userId, userId)
          )
        );

      let invoice_total = 0;
      let invoice_paid = 0;
      let invoice_pending = 0;

      for (const t of cardTxs) {
        const amount = Number(t.amount);
        invoice_total += amount;
        if (t.status === 'paid') {
          invoice_paid += amount;
        } else if (t.status === 'pending') {
          invoice_pending += amount;
        }
      }

      return {
        ...card,
        invoice_total,
        invoice_paid,
        invoice_pending,
      };
    })
  );

  return cardsWithSummary;
}
