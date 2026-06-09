'use server';

import { db } from '@/db';
import { accounts, creditCards, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';

export async function getDashboardData(month?: string) {
  const currentMonth = month || format(new Date(), 'yyyy-MM');

  // Saldos
  const allAccounts = await db.select().from(accounts);
  const totalBalance = allAccounts.reduce((acc, curr) => acc + Number(curr.currentBalance), 0);

  // Transações do mês
  const monthTransactions = await db.select()
    .from(transactions)
    .where(eq(transactions.competencyMonth, currentMonth));

  let totalIncome = 0;
  let totalExpense = 0;

  monthTransactions.forEach(t => {
    if (t.type === 'income') totalIncome += Number(t.amount);
    if (t.type === 'expense' || t.type === 'credit_card_expense') totalExpense += Number(t.amount);
  });

  // Faturas Abertas
  const allCards = await db.select().from(creditCards);
  const cardInvoices = allCards.map(card => {
    const cardExpenses = monthTransactions.filter(t => t.creditCardId === card.id && t.type === 'credit_card_expense');
    const invoiceTotal = cardExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
    return {
      card,
      invoiceTotal,
    };
  });

  return {
    currentMonth,
    totalBalance,
    totalIncome,
    totalExpense,
    cardInvoices: cardInvoices.filter(i => i.invoiceTotal > 0),
    accounts: allAccounts,
  };
}

export async function getBalancesByType() {
  const allAccounts = await db.select().from(accounts);
  
  const grouped = allAccounts.reduce((acc, curr) => {
    const type = curr.type;
    const balance = Number(curr.currentBalance);
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type] += balance;
    return acc;
  }, {} as Record<string, number>);

  const labels: Record<string, string> = {
    checking: 'Conta Corrente',
    savings: 'Poupança',
    wallet: 'Carteira',
    stash: 'Caixinhas',
  };

  const balancesByType = Object.entries(grouped).map(([type, total]) => ({
    type,
    label: labels[type] || 'Outros',
    total,
  }));

  // Ordena por maior saldo primeiro
  balancesByType.sort((a, b) => b.total - a.total);

  const totalBalance = balancesByType.reduce((acc, curr) => acc + curr.total, 0);

  return {
    balancesByType,
    totalBalance,
  };
}
