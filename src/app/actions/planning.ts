'use server';

import { db } from '@/db';
import { transactions, accounts, settings } from '@/db/schema';
import { eq, and, asc, or, inArray } from 'drizzle-orm';
import { format, addDays, differenceInDays, parseISO, lastDayOfMonth } from 'date-fns';
import { auth } from '@/auth';
import { getDefaultCompetencyMonth } from '@/lib/date-utils';

export async function getProjectedCashFlow(accountId?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // 1. Initial balance
  let allAccounts;
  if (accountId === 'checking_accounts') {
    allAccounts = await db.select().from(accounts).where(and(eq(accounts.type, 'checking'), eq(accounts.userId, userId)));
  } else if (accountId) {
    allAccounts = await db.select().from(accounts).where(and(eq(accounts.id, Number(accountId)), eq(accounts.userId, userId)));
  } else {
    allAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
  }
  let currentBalance = allAccounts.reduce((acc, curr) => acc + Number(curr.currentBalance), 0);

  // Fetch settings for closingDay
  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;

  // Calculate the target end date for the projection (end of the current competency month)
  const compMonth = getDefaultCompetencyMonth(closingDay);
  const [year, month] = compMonth.split('-');
  const lastDay = lastDayOfMonth(new Date(Number(year), Number(month) - 1, 1)).getDate();
  const safeClosingDay = Math.min(closingDay, lastDay);
  const targetEndDateStr = `${compMonth}-${String(safeClosingDay).padStart(2, '0')}`;
  const targetEndDate = parseISO(targetEndDateStr);

  // 2. Pending transactions
  const baseDate = new Date();
  const todayDate = format(baseDate, 'yyyy-MM-dd');
  const todayParsed = parseISO(todayDate);
  const diffDays = Math.max(0, differenceInDays(targetEndDate, todayParsed));
  
  const conditions = [
    eq(transactions.status, 'pending'),
    eq(transactions.userId, userId)
  ];
  
  let isCheckingAccount = false;
  if (accountId === 'checking_accounts' || (allAccounts.length === 1 && allAccounts[0].type === 'checking')) {
    isCheckingAccount = true;
  }
  
  if (accountId) {
    if (accountId === 'checking_accounts') {
      const checkingIds = allAccounts.map(a => a.id);
      if (checkingIds.length > 0) {
        conditions.push(
          or(
            inArray(transactions.accountId, checkingIds),
            eq(transactions.type, 'credit_card_expense')
          )!
        );
      } else {
        conditions.push(eq(transactions.id, -1)); // Force no results
      }
    } else if (isCheckingAccount) {
      conditions.push(
        or(
          eq(transactions.accountId, Number(accountId)),
          eq(transactions.type, 'credit_card_expense')
        )!
      );
    } else {
      conditions.push(eq(transactions.accountId, Number(accountId)));
    }
  }

  const allPendingTxs = await db.query.transactions.findMany({
    where: and(...conditions),
    with: {
      category: true,
      account: true,
      creditCard: true,
    },
    orderBy: [asc(transactions.date)],
  });

  // 2.5 Group credit card transactions into invoices
  const processedTxs = [];
  // Use a string map key: creditCardId-competencyMonth
  const ccGroups = new Map<string, typeof allPendingTxs[0]>();

  for (const tx of allPendingTxs) {
    if (tx.type === 'credit_card_expense' && tx.creditCardId && tx.creditCard && tx.competencyMonth) {
      const groupKey = `${tx.creditCardId}-${tx.competencyMonth}`;
      if (!ccGroups.has(groupKey)) {
        const dueDayStr = String(tx.creditCard.dueDay).padStart(2, '0');
        const paymentDate = `${tx.competencyMonth}-${dueDayStr}`;
        ccGroups.set(groupKey, {
          ...tx,
          id: -(tx.creditCardId * 100000 + parseInt(tx.competencyMonth.replace('-', ''))),
          type: 'credit_card_expense',
          amount: '0',
          date: paymentDate,
          description: `Fatura: ${tx.creditCard.name}`,
          category: { 
            id: 0, 
            name: 'Fatura', 
            userId: tx.userId, 
            type: 'expense', 
            icon: 'credit-card', 
            isPredictable: false 
          }
        });
      }
      const group = ccGroups.get(groupKey)!;
      group.amount = String(Number(group.amount) + Number(tx.amount));
    } else {
      processedTxs.push(tx);
    }
  }

  // Push all grouped invoices to processedTxs
  for (const group of ccGroups.values()) {
    processedTxs.push(group);
  }

  // Split into overdue (before today) and projected (today and future)
  const overdueTransactions = processedTxs.filter(tx => tx.date < todayDate);
  const futurePendingTxs = processedTxs.filter(tx => tx.date >= todayDate);

  // Aplica o efeito das transações atrasadas no saldo inicial da projeção
  for (const tx of overdueTransactions) {
    const amount = Number(tx.amount);
    if (tx.type === 'income' || (tx.type === 'transfer' && tx.parentTransactionId)) {
      currentBalance += amount;
    } else if (tx.type === 'expense' || tx.type === 'credit_card_expense' || (tx.type === 'transfer' && !tx.parentTransactionId)) {
      currentBalance -= amount;
    }
  }

  // 3. Group by date map (only for future/today transactions)
  const grouped = new Map<string, typeof futurePendingTxs>();
  for (const tx of futurePendingTxs) {
    if (!grouped.has(tx.date)) {
      grouped.set(tx.date, []);
    }
    grouped.get(tx.date)!.push(tx);
  }

  // 4. Generate days up to the end of the competency month
  const projection = [];
  
  for (let i = 0; i <= diffDays; i++) {
    const targetDate = format(addDays(todayParsed, i), 'yyyy-MM-dd');
    const dailyTxs = grouped.get(targetDate) || [];
    
    let total_expenses = 0;
    let total_incomes = 0;
    
    for (const tx of dailyTxs) {
      const amount = Number(tx.amount);
      if (tx.type === 'income' || (tx.type === 'transfer' && tx.parentTransactionId)) {
        total_incomes += amount;
      } else if (tx.type === 'expense' || tx.type === 'credit_card_expense' || (tx.type === 'transfer' && !tx.parentTransactionId)) {
        total_expenses += amount;
      }
    }
    
    currentBalance = currentBalance + total_incomes - total_expenses;
    
    projection.push({
      date: targetDate,
      total_expenses,
      total_incomes,
      projected_balance: currentBalance,
      transactions_of_the_day: dailyTxs,
    });
  }

  return {
    projection,
    overdueTransactions,
  };
}
