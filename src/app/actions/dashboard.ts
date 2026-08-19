'use server';

import { db } from '@/db';
import { accounts, creditCards, transactions, fixedTransactions, settings } from '@/db/schema';
import { and, eq, gte, inArray, isNotNull, lte, gt, ne } from 'drizzle-orm';
import { addDays, addMonths, endOfMonth, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { auth } from '@/auth';
import { buildGlobalCompetencyCondition } from '@/lib/competency-utils';

import { getTransactions } from './transactions';

export async function getDashboardData(month?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const currentMonth = month || format(new Date(), 'yyyy-MM');

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;

  const allAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
  const totalBalance = allAccounts.reduce((acc, curr) => acc + Number(curr.currentBalance), 0);

  const allCards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));
  const condition = buildGlobalCompetencyCondition(currentMonth, closingDay, userId, allCards);

  const monthTransactions = await db
    .select()
    .from(transactions)
    .where(and(condition, ne(transactions.status, 'ignored')));

  let totalIncome = 0;
  let totalExpense = 0;

  monthTransactions.forEach(t => {
    if (t.type === 'income') totalIncome += Number(t.amount);
    if (t.type === 'expense' || t.type === 'credit_card_expense') totalExpense += Number(t.amount);
  });

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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const allAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));

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
    food: 'Alimentação',
    meal: 'Refeição',
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

export type BalanceEvolutionPoint = {
  month: string;
  balancePast: number | null;
  balanceFuture: number | null;
  isFuture: boolean;
};

function calcDelta(rows: { type: string; amount: string }[]): number {
  return rows.reduce((acc, r) => {
    const amt = Number(r.amount);
    if (r.type === 'income') return acc + amt;
    if (r.type === 'expense' || r.type === 'credit_card_expense') return acc - amt;
    return acc;
  }, 0);
}

export async function getBalanceEvolutionData(): Promise<BalanceEvolutionPoint[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const allAccounts = await db
    .select({ id: accounts.id, currentBalance: accounts.currentBalance })
    .from(accounts)
    .where(eq(accounts.userId, userId));

  if (allAccounts.length === 0) return [];

  const accountIds = allAccounts.map(a => a.id);
  const totalCurrentBalance = allAccounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);

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

  const paidTxs = await db
    .select({ type: transactions.type, amount: transactions.amount, date: transactions.date })
    .from(transactions)
    .where(and(
      inArray(transactions.accountId, accountIds),
      eq(transactions.status, 'paid'),
      eq(transactions.userId, userId)
    ));

  const pendingTxs = await db
    .select({ type: transactions.type, amount: transactions.amount, date: transactions.date })
    .from(transactions)
    .where(and(
      inArray(transactions.accountId, accountIds),
      eq(transactions.status, 'pending'),
      gte(transactions.date, tomorrowStr),
      lte(transactions.date, lastFutureDateStr),
      eq(transactions.userId, userId)
    ));

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
      eq(fixedTransactions.userId, userId)
    ));

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
        eq(transactions.userId, userId)
      ));
    for (const r of matRows) {
      if (r.fixedTransactionId) materializedFixedIds.add(r.fixedTransactionId);
    }
  }

  const points: BalanceEvolutionPoint[] = months.map((monthStart) => {
    const lastDay    = endOfMonth(monthStart);
    const lastDayStr = format(lastDay, 'yyyy-MM-dd');
    const isFuture       = monthStart > currentMonthStart;
    const isCurrentMonth = monthStart.getTime() === currentMonthStart.getTime();

    const monthLabel = format(monthStart, 'MMM', { locale: ptBR });
    const label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    const balancePast = !isFuture
      ? calcDelta(paidTxs.filter(t => t.date <= lastDayStr))
      : null;

    let balanceFuture: number | null = null;
    if (isFuture || isCurrentMonth) {
      const futurePending = pendingTxs.filter(t => t.date <= lastDayStr);

      const virtualRows: { type: string; amount: string }[] = [];
      for (const ft of activeFixed) {
        if (materializedFixedIds.has(ft.id)) continue;

        const ftDay  = new Date(ft.startDate).getDate();
        const cursor = new Date(tomorrow);
        cursor.setDate(ftDay);
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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

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
        inArray(transactions.type, ['expense', 'credit_card_expense']),
        isNotNull(transactions.installmentTotal),
        gt(transactions.installmentTotal, 1),
        gte(transactions.competencyMonth, currentMonth),
        ne(transactions.status, 'ignored'),
        eq(transactions.userId, userId)
      )
    );

  const monthSet = new Set<string>();
  installments.forEach(t => monthSet.add(t.competencyMonth));
  
  const sortedMonths = Array.from(monthSet).sort().slice(0, 12);

  const dataByMonth: Record<string, Record<string, string | number>> = {};
  const keysSet = new Set<string>();

  sortedMonths.forEach(month => {
    dataByMonth[month] = {};
  });

  installments.forEach(t => {
    if (!dataByMonth[t.competencyMonth]) return; 
    // Remove any trailing " (x/y)" from the description to group installments properly
    const key = t.description.replace(/\s*\(\d+\/\d+\)$/, '').trim();
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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [allTransactions, allAccounts] = await Promise.all([
    getTransactions(competencyMonth),
    db.select().from(accounts).where(eq(accounts.userId, userId))
  ]);

  let totalIncome = 0;
  let totalExpense = 0;

  let totalPaidIncome = 0;
  let totalPaidExpense = 0;
  let totalCurrentBalance = 0;

  const accountMap = new Map<number, { accountName: string; income: number; expense: number; currentBalance: number; paidIncome: number; paidExpense: number }>();

  allAccounts.forEach(acc => {
    totalCurrentBalance += Number(acc.currentBalance);
    accountMap.set(acc.id, { 
      accountName: acc.name, 
      income: 0, 
      expense: 0, 
      currentBalance: Number(acc.currentBalance),
      paidIncome: 0,
      paidExpense: 0,
    });
  });

  const filteredTransactions = showOnlyPaid 
    ? allTransactions.filter(t => t.status === 'paid')
    : allTransactions;

  allTransactions.forEach(t => {
    if (t.status === 'paid') {
      if (t.type === 'income') {
        if (t.accountId && accountMap.has(t.accountId)) {
          accountMap.get(t.accountId)!.paidIncome += Number(t.amount);
          totalPaidIncome += Number(t.amount);
        }
      } else if (t.type === 'expense' || t.type === 'credit_card_expense') {
        if (t.accountId && accountMap.has(t.accountId)) {
          accountMap.get(t.accountId)!.paidExpense += Number(t.amount);
          totalPaidExpense += Number(t.amount);
        }
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
        accountMap.set(t.accountId, { accountName: t.account.name, income: 0, expense: 0, currentBalance: 0, paidIncome: 0, paidExpense: 0 });
      }
      const acc = accountMap.get(t.accountId)!;
      if (isIncome) acc.income += amount;
      if (isExpense) acc.expense += amount;
    }
  });

  const globalBaseBalance = totalCurrentBalance - totalPaidIncome + totalPaidExpense;
  const globalData = { name: 'Geral', income: totalIncome, expense: totalExpense, baseBalance: globalBaseBalance };
  
  const byAccountData = Array.from(accountMap.values()).map(acc => ({
    accountName: acc.accountName,
    income: acc.income,
    expense: acc.expense,
    baseBalance: acc.currentBalance - acc.paidIncome + acc.paidExpense,
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

export type TreemapNode = {
  name: string;
  value?: number;
  id?: string;
  children?: TreemapNode[];
};

export type TreemapDataSets = {
  all: TreemapNode;
  variable: TreemapNode;
  installment: TreemapNode;
  fixed: TreemapNode;
};

export async function getExpenseTreemapData(competencyMonth: string): Promise<TreemapDataSets> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;
  const userCards = await db.select({ id: creditCards.id, dueDay: creditCards.dueDay }).from(creditCards).where(eq(creditCards.userId, userId));
  const condition = buildGlobalCompetencyCondition(competencyMonth, closingDay, userId, userCards);

  const rawTransactions = await db.query.transactions.findMany({
    where: and(
      inArray(transactions.type, ['expense', 'credit_card_expense']),
      ne(transactions.status, 'ignored'),
      condition
    ),
    with: {
      category: true,
      subcategory: true,
    }
  });

  const roots: TreemapDataSets = {
    all: { name: 'Despesas', children: [] },
    variable: { name: 'Despesas Variáveis', children: [] },
    installment: { name: 'Despesas Parceladas', children: [] },
    fixed: { name: 'Despesas Fixas', children: [] },
  };

  const maps = {
    all: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
    variable: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
    installment: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
    fixed: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
  };

  const addToTree = (treeType: keyof TreemapDataSets, desc: string, id: string | number, val: number, catName: string, subName: string) => {
    const root = roots[treeType];
    const { cat, sub } = maps[treeType];
    
    if (!cat.has(catName)) {
      const newCat: TreemapNode = { name: catName, children: [] };
      cat.set(catName, newCat);
      root.children!.push(newCat);
    }
    const catNode = cat.get(catName)!;
    const subcatKey = `${catName}-${subName}`;
    if (!sub.has(subcatKey)) {
      const newSub: TreemapNode = { name: subName, children: [] };
      sub.set(subcatKey, newSub);
      catNode.children!.push(newSub);
    }
    const subNode = sub.get(subcatKey)!;
    subNode.children!.push({
      name: desc,
      value: val,
      id: String(id),
    });
  };

  rawTransactions.forEach(t => {
    const catName = t.category?.name || 'Sem Categoria';
    const subName = t.subcategory?.name || 'Geral';
    const val = Number(t.amount);

    const isInstallment = t.installmentTotal && t.installmentTotal > 1;
    const isFixed = t.fixedTransactionId || t.isFixed;
    
    addToTree('all', t.description, t.id, val, catName, subName);

    if (isInstallment) {
      addToTree('installment', t.description, t.id, val, catName, subName);
    } else if (isFixed) {
      addToTree('fixed', t.description, t.id, val, catName, subName);
    } else {
      addToTree('variable', t.description, t.id, val, catName, subName);
    }
  });

  return roots;
}

export async function getExpensesForecastData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const currentMonthDate = new Date();
  const currentMonth = format(currentMonthDate, 'yyyy-MM');
  
  const startMonthDate = subMonths(currentMonthDate, 5);
  const startMonth = format(startMonthDate, 'yyyy-MM');
  
  const endMonthDate = addMonths(currentMonthDate, 6);
  const endMonth = format(endMonthDate, 'yyyy-MM');

  const allTxs = await db
    .select({
      amount: transactions.amount,
      competencyMonth: transactions.competencyMonth,
      type: transactions.type,
      installmentTotal: transactions.installmentTotal,
      fixedTransactionId: transactions.fixedTransactionId,
      isFixed: transactions.isFixed,
    })
    .from(transactions)
    .where(
      and(
        inArray(transactions.type, ['expense', 'credit_card_expense']),
        gte(transactions.competencyMonth, startMonth),
        lte(transactions.competencyMonth, endMonth),
        ne(transactions.status, 'ignored'),
        eq(transactions.userId, userId)
      )
    );

  const activeFixed = await db
    .select({
      id: fixedTransactions.id,
      amount: fixedTransactions.amount,
      startDate: fixedTransactions.startDate,
    })
    .from(fixedTransactions)
    .where(and(
      eq(fixedTransactions.active, true),
      inArray(fixedTransactions.type, ['expense', 'credit_card_expense']),
      eq(fixedTransactions.userId, userId)
    ));

  const monthKeys: string[] = [];
  for (let i = -5; i <= 6; i++) {
    monthKeys.push(format(i === 0 ? currentMonthDate : (i > 0 ? addMonths(currentMonthDate, i) : subMonths(currentMonthDate, Math.abs(i))), 'yyyy-MM'));
  }

  const monthlyData: Record<string, { Parcelas: number; Fixas: number; Variáveis: number; isFuture: boolean }> = {};
  
  monthKeys.forEach(m => {
    monthlyData[m] = { Parcelas: 0, Fixas: 0, Variáveis: 0, isFuture: m > currentMonth };
  });

  const materializedFixedIdsByMonth: Record<string, Set<string>> = {};
  monthKeys.forEach(m => { materializedFixedIdsByMonth[m] = new Set(); });

  allTxs.forEach(t => {
    if (!monthlyData[t.competencyMonth]) return;

    const amt = Number(t.amount);
    const isInstallment = t.installmentTotal && t.installmentTotal > 1;
    const isFixed = t.fixedTransactionId || t.isFixed;

    if (isInstallment) {
      monthlyData[t.competencyMonth].Parcelas += amt;
    } else if (isFixed) {
      monthlyData[t.competencyMonth].Fixas += amt;
      if (t.fixedTransactionId) {
        materializedFixedIdsByMonth[t.competencyMonth].add(t.fixedTransactionId);
      }
    } else {
      monthlyData[t.competencyMonth].Variáveis += amt;
    }
  });

  monthKeys.forEach(m => {
    if (m >= currentMonth) {
      activeFixed.forEach(ft => {
        if (!materializedFixedIdsByMonth[m].has(ft.id)) {
          const ftMonthStr = ft.startDate.substring(0, 7);
          if (ftMonthStr <= m) {
            monthlyData[m].Fixas += Number(ft.amount);
          }
        }
      });
    }
  });

  for (let i = 0; i < monthKeys.length; i++) {
    const m = monthKeys[i];
    if (m > currentMonth) {
      let sumVar = 0;
      let count = 0;
      for (let j = 1; j <= 4; j++) {
        if (i - j >= 0) {
          sumVar += monthlyData[monthKeys[i - j]].Variáveis;
          count++;
        }
      }
      const avg = count > 0 ? sumVar / count : 0;
      monthlyData[m].Variáveis = avg;
    }
  }

  const chartData = monthKeys.map(m => {
    const date = new Date(`${m}-01T00:00:00`);
    const formattedMonth = format(date, 'MMM/yyyy', { locale: ptBR });
    return {
      month: formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1),
      rawMonth: m,
      isFuture: m > currentMonth,
      Parcelas: monthlyData[m].Parcelas,
      Fixas: monthlyData[m].Fixas,
      Variáveis: monthlyData[m].Variáveis,
    };
  });

  return chartData;
}

export async function getCategoryForecastData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const currentMonthDate = new Date();
  const currentMonth = format(currentMonthDate, 'yyyy-MM');
  
  const startMonthDate = subMonths(currentMonthDate, 5);
  const startMonth = format(startMonthDate, 'yyyy-MM');
  
  const endMonthDate = addMonths(currentMonthDate, 6);
  const endMonth = format(endMonthDate, 'yyyy-MM');

  const allTxs = await db.query.transactions.findMany({
    where: and(
      inArray(transactions.type, ['expense', 'credit_card_expense']),
      gte(transactions.competencyMonth, startMonth),
      lte(transactions.competencyMonth, endMonth),
      ne(transactions.status, 'ignored'),
      eq(transactions.userId, userId)
    ),
    with: {
      category: true,
    }
  });

  const activeFixed = await db.query.fixedTransactions.findMany({
    where: and(
      eq(fixedTransactions.active, true),
      inArray(fixedTransactions.type, ['expense', 'credit_card_expense']),
      eq(fixedTransactions.userId, userId)
    ),
    with: {
      category: true,
    }
  });

  const monthKeys: string[] = [];
  for (let i = -5; i <= 6; i++) {
    monthKeys.push(format(i === 0 ? currentMonthDate : (i > 0 ? addMonths(currentMonthDate, i) : subMonths(currentMonthDate, Math.abs(i))), 'yyyy-MM'));
  }

  const variableExpensesByCategory: Record<string, Record<string, number>> = {};
  const monthlyData: Record<string, Record<string, number | string | boolean>> = {};
  
  monthKeys.forEach(m => {
    monthlyData[m] = { rawMonth: m, isFuture: m > currentMonth };
  });

  const materializedFixedIdsByMonth: Record<string, Set<string>> = {};
  monthKeys.forEach(m => { materializedFixedIdsByMonth[m] = new Set(); });

  const categoryKeys = new Set<string>();
  const getCatName = (cat: { name: string } | null | undefined) => cat?.name || 'Sem Categoria';

  allTxs.forEach(t => {
    if (!monthlyData[t.competencyMonth]) return;
    
    const catName = getCatName(t.category);
    categoryKeys.add(catName);

    const amt = Number(t.amount);
    const isInstallment = t.installmentTotal && t.installmentTotal > 1;
    const isFixed = t.fixedTransactionId || t.isFixed;

    if (!monthlyData[t.competencyMonth][catName]) {
      monthlyData[t.competencyMonth][catName] = 0;
    }

    if (isInstallment || isFixed) {
      monthlyData[t.competencyMonth][catName] = (monthlyData[t.competencyMonth][catName] as number) + amt;
      if (t.fixedTransactionId) {
        materializedFixedIdsByMonth[t.competencyMonth].add(t.fixedTransactionId);
      }
    } else {
      monthlyData[t.competencyMonth][catName] = (monthlyData[t.competencyMonth][catName] as number) + amt;
      
      if (!variableExpensesByCategory[catName]) variableExpensesByCategory[catName] = {};
      if (!variableExpensesByCategory[catName][t.competencyMonth]) variableExpensesByCategory[catName][t.competencyMonth] = 0;
      variableExpensesByCategory[catName][t.competencyMonth] += amt;
    }
  });

  monthKeys.forEach(m => {
    if (m >= currentMonth) {
      activeFixed.forEach(ft => {
        if (!materializedFixedIdsByMonth[m].has(ft.id)) {
          const ftMonthStr = ft.startDate.substring(0, 7);
          if (ftMonthStr <= m) {
            const catName = getCatName(ft.category);
            categoryKeys.add(catName);
            if (!monthlyData[m][catName]) monthlyData[m][catName] = 0;
            monthlyData[m][catName] = (monthlyData[m][catName] as number) + Number(ft.amount);
          }
        }
      });
    }
  });

  categoryKeys.forEach(catName => {
    for (let i = 0; i < monthKeys.length; i++) {
      const m = monthKeys[i];
      if (m > currentMonth) {
        let sumVar = 0;
        let count = 0;
        for (let j = 1; j <= 4; j++) {
          if (i - j >= 0) {
            const pastM = monthKeys[i - j];
            const val = variableExpensesByCategory[catName]?.[pastM] || 0;
            sumVar += val;
            count++;
          }
        }
        const avg = count > 0 ? sumVar / count : 0;
        
        if (avg > 0) {
          if (!monthlyData[m][catName]) monthlyData[m][catName] = 0;
          monthlyData[m][catName] = (monthlyData[m][catName] as number) + avg;
          
          if (!variableExpensesByCategory[catName]) variableExpensesByCategory[catName] = {};
          variableExpensesByCategory[catName][m] = avg; 
        }
      }
    }
  });

  const chartData = monthKeys.map(m => {
    const date = new Date(`${m}-01T00:00:00`);
    const formattedMonth = format(date, 'MMM/yyyy', { locale: ptBR });
    return {
      month: formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1),
      ...monthlyData[m],
    };
  });

  return {
    data: chartData,
    keys: Array.from(categoryKeys),
  };
}
