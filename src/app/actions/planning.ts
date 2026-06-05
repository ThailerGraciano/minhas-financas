'use server';

import { db } from '@/db';
import { transactions, accounts } from '@/db/schema';
import { eq, gte, and, asc } from 'drizzle-orm';
import { format, addDays } from 'date-fns';

export async function getProjectedCashFlow(accountId?: string) {
  // 1. Initial balance
  let allAccounts;
  if (accountId) {
    allAccounts = await db.select().from(accounts).where(eq(accounts.id, Number(accountId)));
  } else {
    allAccounts = await db.select().from(accounts);
  }
  let currentBalance = allAccounts.reduce((acc, curr) => acc + Number(curr.currentBalance), 0);

  // 2. Pending transactions
  const baseDate = new Date();
  const todayDate = format(baseDate, 'yyyy-MM-dd');
  
  const conditions = [
    eq(transactions.status, 'pending'),
    gte(transactions.date, todayDate)
  ];
  
  if (accountId) {
    conditions.push(eq(transactions.accountId, Number(accountId)));
  }

  const pendingTxs = await db.query.transactions.findMany({
    where: and(...conditions),
    with: {
      category: true,
      account: true,
    },
    orderBy: [asc(transactions.date)],
  });

  // 3. Group by date map
  const grouped = new Map<string, typeof pendingTxs>();
  for (const tx of pendingTxs) {
    if (!grouped.has(tx.date)) {
      grouped.set(tx.date, []);
    }
    grouped.get(tx.date)!.push(tx);
  }

  // 4. Generate 30 continuous days
  const projection = [];
  
  for (let i = 0; i <= 30; i++) {
    const targetDate = format(addDays(baseDate, i), 'yyyy-MM-dd');
    const dailyTxs = grouped.get(targetDate) || [];
    
    let total_expenses = 0;
    let total_incomes = 0;
    
    for (const tx of dailyTxs) {
      const amount = Number(tx.amount);
      if (tx.type === 'income') {
        total_incomes += amount;
      } else if (tx.type === 'expense' || tx.type === 'credit_card_expense') {
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

  return projection;
}
