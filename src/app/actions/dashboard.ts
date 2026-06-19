'use server';

import { db } from '@/db';
import { accounts, creditCards, transactions, fixedTransactions } from '@/db/schema';
import { and, eq, gte, inArray, isNotNull, lte, gt } from 'drizzle-orm';
import { addDays, addMonths, endOfMonth, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { getTransactions } from './transactions';

export async function getDashboardData(month?: string) {
  const currentMonth = month || format(new Date(), 'yyyy-MM');

  const allAccounts = await db.select().from(accounts);
  const totalBalance = allAccounts.reduce((acc, curr) => acc + Number(curr.currentBalance), 0);

  const monthTransactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.competencyMonth, currentMonth));

  let totalIncome = 0;
  let totalExpense = 0;

  monthTransactions.forEach(t => {
    if (t.type === 'income') totalIncome += Number(t.amount);
    if (t.type === 'expense' || t.type === 'credit_card_expense') totalExpense += Number(t.amount);
  });

  const allCards = await db.select().from(creditCards);
  const cardInvoices = allCards.map(card => {
    const cardExpenses = monthTransactions.filter(
      t => t.creditCardId === card.id && t.type === 'credit_card_expense',
    );
    const invoiceTotal = cardExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
    return { card, invoiceTotal };
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
    if (!acc[type]) acc[type] = 0;
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

  balancesByType.sort((a, b) => b.total - a.total);

  const totalBalance = balancesByType.reduce((acc, curr) => acc + curr.total, 0);

  return { balancesByType, totalBalance };
}

// ---------------------------------------------------------------------------

export type BalanceEvolutionPoint = {
  /** Label do mês para o eixo X, ex: "Jan" */
  month: string;
  /** Saldo total no último dia do mês — preenchido apenas para meses passados + atual */
  balancePast: number | null;
  /** Saldo projetado — preenchido apenas para o mês atual + futuros */
  balanceFuture: number | null;
  /** Indica se este ponto pertence ao futuro (projeção) */
  isFuture: boolean;
};

/** Computa o delta de saldo (positivo = crédito, negativo = débito). */
function calcDelta(rows: { type: string; amount: string }[]): number {
  return rows.reduce((acc, r) => {
    const amt = Number(r.amount);
    if (r.type === 'income') return acc + amt;
    if (r.type === 'expense' || r.type === 'credit_card_expense') return acc - amt;
    return acc; // 'transfer' se cancela nos dois lados
  }, 0);
}

/**
 * Constrói a série de dados para o gráfico de evolução de saldo.
 *
 * Faz apenas 4–5 queries bulk no banco e calcula tudo em JavaScript,
 * evitando o esgotamento do connection pool que ocorria com 100+ queries paralelas.
 *
 * - PASSADO: reconstrói o saldo somando todas as transações pagas até cada data.
 * - FUTURO:  parte do current_balance e acumula pendentes + fixas virtuais.
 * - O mês atual aparece em AMBAS as séries para conectar as duas linhas no Recharts.
 */
export async function getBalanceEvolutionData(): Promise<BalanceEvolutionPoint[]> {
  // ── Query 1: contas ────────────────────────────────────────────────────────
  const allAccounts = await db
    .select({ id: accounts.id, currentBalance: accounts.currentBalance })
    .from(accounts);

  if (allAccounts.length === 0) return [];

  const accountIds = allAccounts.map(a => a.id);
  const totalCurrentBalance = allAccounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);

  // Datas de referência
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const tomorrow    = addDays(today, 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

  const months = [
    ...Array.from({ length: 6 }, (_, i) => subMonths(currentMonthStart, 6 - i)),
    currentMonthStart,
    ...Array.from({ length: 6 }, (_, i) => addMonths(currentMonthStart, i + 1)),
  ];

  const lastFutureDateStr = format(endOfMonth(months[months.length - 1]), 'yyyy-MM-dd');

  // ── Query 2: todas as transações PAGAS (para reconstrução histórica) ───────
  const paidTxs = await db
    .select({ type: transactions.type, amount: transactions.amount, date: transactions.date })
    .from(transactions)
    .where(and(
      inArray(transactions.accountId, accountIds),
      eq(transactions.status, 'paid'),
    ));

  // ── Query 3: transações PENDENTES na janela futura ─────────────────────────
  const pendingTxs = await db
    .select({ type: transactions.type, amount: transactions.amount, date: transactions.date })
    .from(transactions)
    .where(and(
      inArray(transactions.accountId, accountIds),
      eq(transactions.status, 'pending'),
      gte(transactions.date, tomorrowStr),
      lte(transactions.date, lastFutureDateStr),
    ));

  // ── Query 4: fixed_transactions ativas ────────────────────────────────────
  const activeFixed = await db
    .select({
      id:        fixedTransactions.id,
      type:      fixedTransactions.type,
      amount:    fixedTransactions.amount,
      startDate: fixedTransactions.startDate,
    })
    .from(fixedTransactions)
    .where(and(
      eq(fixedTransactions.active, true),
      inArray(fixedTransactions.accountId, accountIds),
    ));

  // ── Query 5: IDs de fixas já materializadas na janela futura ──────────────
  const materializedFixedIds = new Set<string>();
  if (activeFixed.length > 0) {
    const matRows = await db
      .select({ fixedTransactionId: transactions.fixedTransactionId })
      .from(transactions)
      .where(and(
        inArray(transactions.accountId, accountIds),
        gte(transactions.date, tomorrowStr),
        lte(transactions.date, lastFutureDateStr),
        isNotNull(transactions.fixedTransactionId),
      ));
    for (const r of matRows) {
      if (r.fixedTransactionId) materializedFixedIds.add(r.fixedTransactionId);
    }
  }

  // ── Cálculo em JS — sem nenhuma query adicional ───────────────────────────
  const points: BalanceEvolutionPoint[] = months.map((monthStart) => {
    const lastDay    = endOfMonth(monthStart);
    const lastDayStr = format(lastDay, 'yyyy-MM-dd');
    const isFuture       = monthStart > currentMonthStart;
    const isCurrentMonth = monthStart.getTime() === currentMonthStart.getTime();

    const monthLabel = format(monthStart, 'MMM', { locale: ptBR });
    const label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    // PASSADO — soma todas as pagas com date <= último dia do mês
    const balancePast = !isFuture
      ? calcDelta(paidTxs.filter(t => t.date <= lastDayStr))
      : null;

    // FUTURO — current_balance + pendentes + fixas virtuais até o último dia
    let balanceFuture: number | null = null;
    if (isFuture || isCurrentMonth) {
      const futurePending = pendingTxs.filter(t => t.date <= lastDayStr);

      // Gera ocorrências virtuais de cada fixa não materializada até lastDay
      const virtualRows: { type: string; amount: string }[] = [];
      for (const ft of activeFixed) {
        if (materializedFixedIds.has(ft.id)) continue;

        const ftDay  = new Date(ft.startDate).getDate();
        const cursor = new Date(tomorrow);
        cursor.setDate(ftDay);
        // Se o dia da fixa neste mês já passou em relação a amanhã, avança um mês
        if (cursor < tomorrow) cursor.setMonth(cursor.getMonth() + 1);

        while (cursor <= lastDay) {
          virtualRows.push({ type: ft.type, amount: ft.amount });
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }

      balanceFuture = totalCurrentBalance + calcDelta([...futurePending, ...virtualRows]);
    }

    return { month: label, balancePast, balanceFuture, isFuture };
  });

  return points;
}

export async function getInstallmentsChartData() {
  const currentMonth = format(new Date(), 'yyyy-MM');

  const installments = await db
    .select({
      description: transactions.description,
      amount: transactions.amount,
      competencyMonth: transactions.competencyMonth,
      installmentCurrent: transactions.installmentCurrent,
      installmentTotal: transactions.installmentTotal,
    })
    .from(transactions)
    .where(
      and(
        isNotNull(transactions.installmentTotal),
        gt(transactions.installmentTotal, 1),
        gte(transactions.competencyMonth, currentMonth)
      )
    );

  const monthSet = new Set<string>();
  installments.forEach(t => monthSet.add(t.competencyMonth));
  
  // Limitar projeção para no máximo 12 meses para não quebrar o layout
  const sortedMonths = Array.from(monthSet).sort().slice(0, 12);

  const dataByMonth: Record<string, Record<string, string | number>> = {};
  const keysSet = new Set<string>();

  sortedMonths.forEach(month => {
    dataByMonth[month] = {};
  });

  installments.forEach(t => {
    if (!dataByMonth[t.competencyMonth]) return; // Ignora se estiver fora do range de 12 meses
    const key = t.description;
    keysSet.add(key);

    const amount = Number(t.amount);
    if (typeof dataByMonth[t.competencyMonth][key] !== 'number') {
      dataByMonth[t.competencyMonth][key] = 0;
    }
    (dataByMonth[t.competencyMonth][key] as number) += amount;

    if (t.installmentCurrent && t.installmentTotal) {
      dataByMonth[t.competencyMonth][`${key}_installment`] = `${t.installmentCurrent}/${t.installmentTotal}`;
    }
  });

  const chartData = sortedMonths.map(month => {
    const obj = dataByMonth[month];
    const date = new Date(`${month}-01T00:00:00`);
    const formattedMonth = format(date, 'MMM/yyyy', { locale: ptBR });
    return {
      month: formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1),
      ...obj,
    };
  });

  return {
    data: chartData,
    keys: Array.from(keysSet),
  };
}

export async function getIncomeVsExpenseData(competencyMonth: string, showOnlyPaid: boolean = false) {
  const [allTransactions, allAccounts] = await Promise.all([
    getTransactions(competencyMonth),
    db.select().from(accounts)
  ]);

  let totalIncome = 0;
  let totalExpense = 0;

  let totalPaidIncome = 0;
  let totalCurrentBalance = 0;

  const accountMap = new Map<number, { accountName: string; income: number; expense: number; currentBalance: number; paidIncome: number }>();

  allAccounts.forEach(acc => {
    totalCurrentBalance += Number(acc.currentBalance);
    accountMap.set(acc.id, { 
      accountName: acc.name, 
      income: 0, 
      expense: 0, 
      currentBalance: Number(acc.currentBalance),
      paidIncome: 0,
    });
  });

  const filteredTransactions = showOnlyPaid 
    ? allTransactions.filter(t => t.status === 'paid')
    : allTransactions;

  // Calculate paid income of the current month to subtract from current balance
  allTransactions.forEach(t => {
    if (t.type === 'income' && t.status === 'paid') {
      if (t.accountId && accountMap.has(t.accountId)) {
        accountMap.get(t.accountId)!.paidIncome += Number(t.amount);
        totalPaidIncome += Number(t.amount);
      }
    }
  });

  filteredTransactions.forEach(t => {
    const amount = Number(t.amount);
    const isIncome = t.type === 'income';
    const isExpense = t.type === 'expense' || t.type === 'credit_card_expense';

    if (isIncome) totalIncome += amount;
    if (isExpense) totalExpense += amount;

    if (t.accountId && t.account) {
      if (!accountMap.has(t.accountId)) {
        accountMap.set(t.accountId, { accountName: t.account.name, income: 0, expense: 0, currentBalance: 0, paidIncome: 0 });
      }
      const acc = accountMap.get(t.accountId)!;
      if (isIncome) acc.income += amount;
      if (isExpense) acc.expense += amount;
    }
  });

  const globalBaseBalance = totalCurrentBalance - totalPaidIncome;
  const globalData = { name: 'Geral', income: totalIncome, expense: totalExpense, baseBalance: globalBaseBalance };
  
  const byAccountData = Array.from(accountMap.values()).map(acc => ({
    accountName: acc.accountName,
    income: acc.income,
    expense: acc.expense,
    baseBalance: acc.currentBalance - acc.paidIncome,
  }));

  const accountVsGlobalData = byAccountData.map(acc => ({
    ...acc,
    globalExpense: totalExpense,
  }));

  return {
    global: globalData,
    byAccount: byAccountData,
    accountVsGlobal: accountVsGlobalData,
  };
}
