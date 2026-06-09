'use server';

import { db } from '@/db';
import { creditCards, transactions, accounts, categories, subcategories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';

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

export async function getCreditCard(id: number) {
  const [card] = await db.select().from(creditCards).where(eq(creditCards.id, id));
  return card;
}

export async function updateCreditCard(id: number, data: Partial<typeof creditCards.$inferInsert>) {
  try {
    await db.update(creditCards).set(data).where(eq(creditCards.id, id));
    revalidatePath('/credit-cards');
    revalidatePath(`/credit-cards/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating credit card:', error);
    return { success: false, error: 'Failed to update credit card' };
  }
}

export async function getInvoiceSummary(creditCardId: string | number, competencyMonth: string) {
  const parsedId = Number(creditCardId);
  const cardTransactions = await db.query.transactions.findMany({
    where: (t, { eq, and }) => and(
      eq(t.creditCardId, parsedId),
      eq(t.competencyMonth, competencyMonth),
      eq(t.type, 'credit_card_expense')
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
            eq(transactions.type, 'credit_card_expense')
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
            eq(transactions.status, 'pending')
          )
        );

      // 3. Find or create Category for "Pagamento de Fatura"
      let category = await tx.query.categories.findFirst({
        where: (categories, { eq }) => eq(categories.name, 'Pagamento de Fatura')
      });
      let subcategoryId = null;

      if (!category) {
        const [newCategory] = await tx.insert(categories)
          .values({ name: 'Pagamento de Fatura', type: 'expense', icon: 'CreditCard' })
          .returning();
        
        const [newSubcategory] = await tx.insert(subcategories)
          .values({ name: 'Geral', categoryId: newCategory.id })
          .returning();
          
        category = newCategory;
        subcategoryId = newSubcategory.id;
      } else {
        const subcategory = await tx.query.subcategories.findFirst({
          where: (subcategories, { eq }) => eq(subcategories.categoryId, category!.id)
        });
        subcategoryId = subcategory?.id || null;
        
        if (!subcategoryId) {
          const [newSubcategory] = await tx.insert(subcategories)
            .values({ name: 'Geral', categoryId: category.id })
            .returning();
          subcategoryId = newSubcategory.id;
        }
      }

      // 4. Create the transfer transaction for the payment (avoids double counting in expenses)
      await tx.insert(transactions).values({
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
      const [account] = await tx.select().from(accounts).where(eq(accounts.id, parsedAccountId));
      if (account) {
        const newBalance = Number(account.currentBalance) - pendingAmount;
        await tx.update(accounts)
          .set({ currentBalance: newBalance.toString() })
          .where(eq(accounts.id, parsedAccountId));
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
