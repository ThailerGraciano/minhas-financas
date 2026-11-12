"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { accounts, creditCards, fixedTransactions, settings, transactions } from "@/db/schema";
import { buildGlobalCompetencyCondition } from "@/lib/competency-utils";
import { addDays, addMonths, endOfMonth, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { and, eq, gt, gte, inArray, isNotNull, lte, ne } from "drizzle-orm";

export type ExpenseBreakdown = {
  fixed: number;
  variable: number;
  installment: number;
};

export type ReserveSparklinePoint = {
  month: string;
  balance: number;
  balancePast: number | null;
  balanceFuture: number | null;
  isFuture: boolean;
  isCurrent: boolean;
};

export type ReserveData = {
  accountName: string;
  currentBalance: number;
  monthAporte: number;
  fixedAporte: number;
  variableAporte: number;
  growthAmount: number;
  growthPercentage: number;
  coverageMonths: number | null;
  targetAmount: number | null;
  sparkline: ReserveSparklinePoint[];
};

export type StashAccount = {
  id: number;
  name: string;
  type: string;
  currentBalance: number;
  monthAporte: number;
  monthVariation: number;
  targetAmount: number | null;
};

export async function getDashboardData(month?: string, dateMode: "due_date" | "launch_date" = "due_date") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const currentMonth = month || format(new Date(), "yyyy-MM");

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;

  const allAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
  const totalBalance = allAccounts.reduce((acc, curr) => acc + Number(curr.currentBalance), 0);

  const allCards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));
  const condition = buildGlobalCompetencyCondition(currentMonth, closingDay, userId, allCards, dateMode);

  const monthTransactions = await db
    .select()
    .from(transactions)
    .where(and(condition, ne(transactions.status, "ignored")));

  let totalIncome = 0;
  let totalExpense = 0;
  let fixedExpense = 0;
  let variableExpense = 0;
  let installmentExpense = 0;

  monthTransactions.forEach((t) => {
    const amt = Number(t.amount);
    if (t.type === "income") {
      totalIncome += amt;
    } else if (t.type === "expense" || t.type === "credit_card_expense") {
      totalExpense += amt;
      const isInstallment = Boolean(t.installmentTotal && t.installmentTotal > 1);
      const isFixed = Boolean(t.fixedTransactionId || t.isFixed);
      if (isInstallment) {
        installmentExpense += amt;
      } else if (isFixed) {
        fixedExpense += amt;
      } else {
        variableExpense += amt;
      }
    }
  });

  const cardInvoices = allCards.map((card) => {
    const cardExpenses = monthTransactions.filter(
      (t) => t.creditCardId === card.id && t.type === "credit_card_expense",
    );
    const invoiceTotal = cardExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
    return { card, invoiceTotal };
  });

  // Identificação e cálculo da Reserva de Emergência
  const reserveAccount =
    allAccounts.find((a) => a.name.toLowerCase().includes("reserva")) ||
    allAccounts.find((a) => a.type === "savings") ||
    null;

  let reserveData: ReserveData | null = null;

  if (reserveAccount) {
    const reserveBalance = Number(reserveAccount.currentBalance);

    let monthInflows = 0;
    let monthOutflows = 0;

    monthTransactions.forEach((t) => {
      if (t.accountId === reserveAccount.id) {
        const amt = Number(t.amount);
        if (t.type === "income" || (t.type === "transfer" && t.parentTransactionId !== null)) {
          monthInflows += amt;
        } else if (
          (t.type === "transfer" && t.parentTransactionId === null) ||
          t.type === "expense" ||
          t.type === "credit_card_expense"
        ) {
          monthOutflows += amt;
        }
      }
    });

    const monthAporte = monthInflows;
    const netVariation = monthInflows - monthOutflows;
    const prevBalance = reserveBalance - netVariation;
    const growthPercentage = prevBalance > 0 ? (netVariation / prevBalance) * 100 : 0;

    const fixedAporte = 250;
    const variableAporte = Math.max(0, monthAporte - fixedAporte);

    const essentialExpenseBase = fixedExpense > 0 ? fixedExpense : totalExpense;
    const coverageMonths = essentialExpenseBase > 0 ? reserveBalance / essentialExpenseBase : null;

    // Sparkline: 3 meses passados + mês atual (hoje no meio) + 3 meses futuros = 7 meses
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const pastMonthsDates = Array.from({ length: 4 }, (_, i) => subMonths(currentMonthStart, 3 - i));
    const futureMonthsDates = Array.from({ length: 3 }, (_, i) => addMonths(currentMonthStart, i + 1));

    const threeMonthsAgoStr = format(pastMonthsDates[0], "yyyy-MM-01");
    const lastFutureDateStr = format(endOfMonth(futureMonthsDates[futureMonthsDates.length - 1]), "yyyy-MM-dd");

    const [reserveWindowTxs, userFixedTxs] = await Promise.all([
      db
        .select({
          type: transactions.type,
          amount: transactions.amount,
          dueDate: transactions.dueDate,
          competencyMonth: transactions.competencyMonth,
          status: transactions.status,
          parentTransactionId: transactions.parentTransactionId,
          fixedTransactionId: transactions.fixedTransactionId,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, reserveAccount.id),
            ne(transactions.status, "ignored"),
            gte(transactions.dueDate, threeMonthsAgoStr),
            lte(transactions.dueDate, lastFutureDateStr),
            eq(transactions.userId, userId),
          ),
        ),
      db
        .select()
        .from(fixedTransactions)
        .where(and(eq(fixedTransactions.userId, userId), eq(fixedTransactions.active, true))),
    ]);

    const deltasByMonth: Record<string, number> = {};
    const pendingDeltasByMonth: Record<string, number> = {};
    const materializedFixedByMonth = new Set<string>();

    reserveWindowTxs.forEach((t) => {
      const m = t.dueDate ? t.dueDate.substring(0, 7) : t.competencyMonth;
      if (!m) return;

      if (t.fixedTransactionId) {
        materializedFixedByMonth.add(`${m}-${t.fixedTransactionId}`);
      }

      const amt = Number(t.amount);
      let delta = 0;
      if (t.type === "income" || (t.type === "transfer" && t.parentTransactionId !== null)) {
        delta = amt;
      } else if (
        (t.type === "transfer" && t.parentTransactionId === null) ||
        t.type === "expense" ||
        t.type === "credit_card_expense"
      ) {
        delta = -amt;
      }

      if (t.status === "paid") {
        deltasByMonth[m] = (deltasByMonth[m] || 0) + delta;
      } else if (t.status === "pending") {
        pendingDeltasByMonth[m] = (pendingDeltasByMonth[m] || 0) + delta;
      }
    });

    const reserveFixedInflows = userFixedTxs.filter(
      (ft) =>
        (ft.type === "income" && ft.accountId === reserveAccount.id) ||
        (ft.type === "transfer" && ft.destinationAccountId === reserveAccount.id),
    );
    const reserveFixedOutflows = userFixedTxs.filter(
      (ft) =>
        (ft.type === "expense" && ft.accountId === reserveAccount.id) ||
        (ft.type === "transfer" && ft.accountId === reserveAccount.id),
    );

    let runningBalance = reserveBalance;
    const reversedPastPoints: ReserveSparklinePoint[] = [];
    for (let i = pastMonthsDates.length - 1; i >= 0; i--) {
      const mDate = pastMonthsDates[i];
      const mKey = format(mDate, "yyyy-MM");
      const mLabel = format(mDate, "MMM", { locale: ptBR });
      const capitalized = mLabel.charAt(0).toUpperCase() + mLabel.slice(1).replace(".", "");
      const isCurrent = i === pastMonthsDates.length - 1;
      const rounded = Math.max(0, Math.round(runningBalance * 100) / 100);

      reversedPastPoints.push({
        month: capitalized,
        balance: rounded,
        balancePast: rounded,
        balanceFuture: isCurrent ? rounded : null,
        isFuture: false,
        isCurrent,
      });

      const deltaThisMonth = deltasByMonth[mKey] || 0;
      runningBalance -= deltaThisMonth;
    }
    const pastPoints = reversedPastPoints.reverse();

    let runningFutureBalance = reserveBalance;
    const futurePoints: ReserveSparklinePoint[] = [];
    for (let i = 0; i < futureMonthsDates.length; i++) {
      const mDate = futureMonthsDates[i];
      const mKey = format(mDate, "yyyy-MM");
      const mLabel = format(mDate, "MMM", { locale: ptBR });
      const capitalized = mLabel.charAt(0).toUpperCase() + mLabel.slice(1).replace(".", "");

      let monthFutureDelta = pendingDeltasByMonth[mKey] || 0;

      for (const ft of reserveFixedInflows) {
        const ftStartMonth = ft.startDate.substring(0, 7);
        if (mKey >= ftStartMonth && !materializedFixedByMonth.has(`${mKey}-${ft.id}`)) {
          monthFutureDelta += Number(ft.amount);
        }
      }

      for (const ft of reserveFixedOutflows) {
        const ftStartMonth = ft.startDate.substring(0, 7);
        if (mKey >= ftStartMonth && !materializedFixedByMonth.has(`${mKey}-${ft.id}`)) {
          monthFutureDelta -= Number(ft.amount);
        }
      }

      if (reserveFixedInflows.length === 0) {
        monthFutureDelta += fixedAporte;
      }

      runningFutureBalance += monthFutureDelta;
      const roundedFuture = Math.max(0, Math.round(runningFutureBalance * 100) / 100);

      futurePoints.push({
        month: capitalized,
        balance: roundedFuture,
        balancePast: null,
        balanceFuture: roundedFuture,
        isFuture: true,
        isCurrent: false,
      });
    }

    const sparkline = [...pastPoints, ...futurePoints];

    reserveData = {
      accountName: reserveAccount.name,
      currentBalance: reserveBalance,
      monthAporte,
      fixedAporte,
      variableAporte,
      growthAmount: netVariation,
      growthPercentage,
      coverageMonths,
      targetAmount: reserveAccount.targetAmount ? Number(reserveAccount.targetAmount) : null,
      sparkline,
    };
  }

  // Identificação e cálculo de Caixinhas / Objetivos
  const stashAccounts: StashAccount[] = allAccounts
    .filter((a) => {
      const lower = a.name.toLowerCase();
      return (
        a.type === "stash" ||
        a.type === "savings" ||
        lower.includes("reserva") ||
        lower.includes("carro") ||
        lower.includes("casa") ||
        lower.includes("viagem") ||
        lower.includes("meta")
      );
    })
    .map((a) => {
      let inflows = 0;
      let outflows = 0;
      monthTransactions.forEach((t) => {
        if (t.accountId === a.id) {
          const amt = Number(t.amount);
          if (t.type === "income" || (t.type === "transfer" && t.parentTransactionId !== null)) {
            inflows += amt;
          } else if (
            (t.type === "transfer" && t.parentTransactionId === null) ||
            t.type === "expense" ||
            t.type === "credit_card_expense"
          ) {
            outflows += amt;
          }
        }
      });
      return {
        id: a.id,
        name: a.name,
        type: a.type,
        currentBalance: Number(a.currentBalance),
        monthAporte: inflows,
        monthVariation: inflows - outflows,
        targetAmount: a.targetAmount ? Number(a.targetAmount) : null,
      };
    });

  return {
    currentMonth,
    totalBalance,
    totalIncome,
    totalExpense,
    expenseBreakdown: {
      fixed: fixedExpense,
      variable: variableExpense,
      installment: installmentExpense,
    },
    reserveData,
    stashAccounts,
    cardInvoices: cardInvoices.filter((i) => i.invoiceTotal > 0),
    accounts: allAccounts,
  };
}

export async function getBalancesByType() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const allAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));

  const grouped = allAccounts.reduce(
    (acc, curr) => {
      const type = curr.type;
      const balance = Number(curr.currentBalance);
      if (!acc[type]) acc[type] = 0;
      acc[type] += balance;
      return acc;
    },
    {} as Record<string, number>,
  );

  const labels: Record<string, string> = {
    checking: "Conta Corrente",
    savings: "Poupança",
    wallet: "Carteira",
    stash: "Caixinhas",
    food: "Alimentação",
    meal: "Refeição",
  };

  const balancesByType = Object.entries(grouped).map(([type, total]) => ({
    type,
    label: labels[type] || "Outros",
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
    if (r.type === "income") return acc + amt;
    if (r.type === "expense" || r.type === "credit_card_expense") return acc - amt;
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

  const accountIds = allAccounts.map((a) => a.id);
  const totalCurrentBalance = allAccounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const tomorrow = addDays(today, 1);
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

  const months = [
    ...Array.from({ length: 6 }, (_, i) => subMonths(currentMonthStart, 6 - i)),
    currentMonthStart,
    ...Array.from({ length: 6 }, (_, i) => addMonths(currentMonthStart, i + 1)),
  ];

  const lastFutureDateStr = format(endOfMonth(months[months.length - 1]), "yyyy-MM-dd");

  const paidTxs = await db
    .select({ type: transactions.type, amount: transactions.amount, dueDate: transactions.dueDate })
    .from(transactions)
    .where(
      and(
        inArray(transactions.accountId, accountIds),
        eq(transactions.status, "paid"),
        eq(transactions.userId, userId),
      ),
    );

  const pendingTxs = await db
    .select({ type: transactions.type, amount: transactions.amount, dueDate: transactions.dueDate })
    .from(transactions)
    .where(
      and(
        inArray(transactions.accountId, accountIds),
        eq(transactions.status, "pending"),
        gte(transactions.dueDate, tomorrowStr),
        lte(transactions.dueDate, lastFutureDateStr),
        eq(transactions.userId, userId),
      ),
    );

  const activeFixed = await db
    .select({
      id: fixedTransactions.id,
      type: fixedTransactions.type,
      amount: fixedTransactions.amount,
      startDate: fixedTransactions.startDate,
    })
    .from(fixedTransactions)
    .where(
      and(
        eq(fixedTransactions.active, true),
        inArray(fixedTransactions.accountId, accountIds),
        eq(fixedTransactions.userId, userId),
      ),
    );

  const materializedFixedIds = new Set<string>();
  if (activeFixed.length > 0) {
    const matRows = await db
      .select({ fixedTransactionId: transactions.fixedTransactionId })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          gte(transactions.dueDate, tomorrowStr),
          lte(transactions.dueDate, lastFutureDateStr),
          isNotNull(transactions.fixedTransactionId),
          eq(transactions.userId, userId),
        ),
      );
    for (const r of matRows) {
      if (r.fixedTransactionId) materializedFixedIds.add(r.fixedTransactionId);
    }
  }

  const points: BalanceEvolutionPoint[] = months.map((monthStart) => {
    const lastDay = endOfMonth(monthStart);
    const lastDayStr = format(lastDay, "yyyy-MM-dd");
    const isFuture = monthStart > currentMonthStart;
    const isCurrentMonth = monthStart.getTime() === currentMonthStart.getTime();

    const monthLabel = format(monthStart, "MMM", { locale: ptBR });
    const label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    const balancePast = !isFuture ? calcDelta(paidTxs.filter((t) => t.dueDate <= lastDayStr)) : null;

    let balanceFuture: number | null = null;
    if (isFuture || isCurrentMonth) {
      const futurePending = pendingTxs.filter((t) => t.dueDate <= lastDayStr);

      const virtualRows: { type: string; amount: string }[] = [];
      for (const ft of activeFixed) {
        if (materializedFixedIds.has(ft.id)) continue;

        const ftDay = new Date(ft.startDate).getDate();
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

  const currentMonthDate = new Date();
  const currentMonth = format(currentMonthDate, "yyyy-MM");
  const threeMonthsAgo = format(subMonths(currentMonthDate, 3), "yyyy-MM");

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
        inArray(transactions.type, ["expense", "credit_card_expense"]),
        isNotNull(transactions.installmentTotal),
        gt(transactions.installmentTotal, 1),
        gte(transactions.competencyMonth, threeMonthsAgo),
        ne(transactions.status, "ignored"),
        eq(transactions.userId, userId),
      ),
    );

  let minMonth = currentMonth;
  installments.forEach((t) => {
    if (t.competencyMonth < minMonth) {
      minMonth = t.competencyMonth;
    }
  });

  const sortedMonths: string[] = [];
  const minMonthDate = new Date(`${minMonth}-02T00:00:00`);
  for (let i = 0; i < 12; i++) {
    sortedMonths.push(format(addMonths(minMonthDate, i), "yyyy-MM"));
  }

  const dataByMonth: Record<string, Record<string, string | number | boolean>> = {};
  const keysSet = new Set<string>();
  const keyStats: Record<
    string,
    {
      maxCompetencyMonth: string;
      maxMonthInWindow: string;
      minMonthInWindow: string;
      activeMonthsSet: Set<string>;
      totalAmountInWindow: number;
    }
  > = {};

  sortedMonths.forEach((month) => {
    dataByMonth[month] = {
      isPast: month < currentMonth,
    };
  });

  installments.forEach((t) => {
    // Remove any trailing " (x/y)" from the description to group installments properly
    const key = t.description.replace(/\s*\(\d+\/\d+\)$/, "").trim();
    const amount = Number(t.amount);

    if (!keyStats[key]) {
      keyStats[key] = {
        maxCompetencyMonth: t.competencyMonth,
        maxMonthInWindow: "",
        minMonthInWindow: "9999-99",
        activeMonthsSet: new Set<string>(),
        totalAmountInWindow: 0,
      };
    } else if (t.competencyMonth > keyStats[key].maxCompetencyMonth) {
      keyStats[key].maxCompetencyMonth = t.competencyMonth;
    }

    if (!dataByMonth[t.competencyMonth]) return;
    keysSet.add(key);

    if (t.competencyMonth > keyStats[key].maxMonthInWindow) {
      keyStats[key].maxMonthInWindow = t.competencyMonth;
    }
    if (t.competencyMonth < keyStats[key].minMonthInWindow) {
      keyStats[key].minMonthInWindow = t.competencyMonth;
    }
    keyStats[key].activeMonthsSet.add(t.competencyMonth);
    keyStats[key].totalAmountInWindow += amount;

    if (typeof dataByMonth[t.competencyMonth][key] !== "number") {
      dataByMonth[t.competencyMonth][key] = 0;
    }
    (dataByMonth[t.competencyMonth][key] as number) += amount;

    if (t.installmentCurrent && t.installmentTotal) {
      dataByMonth[t.competencyMonth][`${key}_installment`] = `${t.installmentCurrent}/${t.installmentTotal}`;
    }
  });

  // Ordena as chaves para que os parcelamentos que demoram mais para quitar (maior duração / valor)
  // fiquem na base do gráfico empilhado (primeiros índices) e os mais curtos fiquem no topo.
  const sortedKeys = Array.from(keysSet).sort((a, b) => {
    const statA = keyStats[a];
    const statB = keyStats[b];
    if (!statA || !statB) return 0;

    // 1. Quem termina mais tarde dentro da janela visível fica mais na base
    if (statA.maxMonthInWindow !== statB.maxMonthInWindow) {
      return statB.maxMonthInWindow.localeCompare(statA.maxMonthInWindow);
    }

    // 2. Empate no fim da janela: quem demora mais para quitar no banco (além dos 12 meses) fica mais na base
    if (statA.maxCompetencyMonth !== statB.maxCompetencyMonth) {
      return statB.maxCompetencyMonth.localeCompare(statA.maxCompetencyMonth);
    }

    // 3. Maior quantidade de meses ativos na horizontal (ou início mais antigo) fica mais na base
    if (statA.activeMonthsSet.size !== statB.activeMonthsSet.size) {
      return statB.activeMonthsSet.size - statA.activeMonthsSet.size;
    }

    if (statA.minMonthInWindow !== statB.minMonthInWindow) {
      return statA.minMonthInWindow.localeCompare(statB.minMonthInWindow);
    }

    // 4. Maior valor acumulado na janela fica mais na base
    return statB.totalAmountInWindow - statA.totalAmountInWindow;
  });

  const chartData = sortedMonths.map((month) => {
    const obj = dataByMonth[month];
    const date = new Date(`${month}-02T00:00:00`);
    const formattedMonth = format(date, "MMM/yyyy", { locale: ptBR });
    return {
      month: formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1),
      ...obj,
    };
  });

  return {
    data: chartData,
    keys: sortedKeys,
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

export async function getExpenseTreemapData(
  competencyMonth: string,
  dateMode: "due_date" | "launch_date" = "due_date",
): Promise<TreemapDataSets> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;
  const userCards = await db

    .select({ id: creditCards.id, dueDay: creditCards.dueDay, closingDay: creditCards.closingDay })
    .from(creditCards)
    .where(eq(creditCards.userId, userId));
  const condition = buildGlobalCompetencyCondition(competencyMonth, closingDay, userId, userCards, dateMode);

  const rawTransactions = await db.query.transactions.findMany({
    where: and(
      inArray(transactions.type, ["expense", "credit_card_expense"]),
      ne(transactions.status, "ignored"),
      condition,
    ),
    with: {
      category: true,
      subcategory: true,
    },
  });

  const roots: TreemapDataSets = {
    all: { name: "Despesas", children: [] },
    variable: { name: "Despesas Variáveis", children: [] },
    installment: { name: "Despesas Parceladas", children: [] },
    fixed: { name: "Despesas Fixas", children: [] },
  };

  const maps = {
    all: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
    variable: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
    installment: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
    fixed: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
  };

  const addToTree = (
    treeType: keyof TreemapDataSets,
    desc: string,
    id: string | number,
    val: number,
    catName: string,
    subName: string,
  ) => {
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

  rawTransactions.forEach((t) => {
    const catName = t.category?.name || "Sem Categoria";
    const subName = t.subcategory?.name || "Geral";
    const val = Number(t.amount);

    const isInstallment = t.installmentTotal && t.installmentTotal > 1;
    const isFixed = t.fixedTransactionId || t.isFixed;

    addToTree("all", t.description, t.id, val, catName, subName);

    if (isInstallment) {
      addToTree("installment", t.description, t.id, val, catName, subName);
    } else if (isFixed) {
      addToTree("fixed", t.description, t.id, val, catName, subName);
    } else {
      addToTree("variable", t.description, t.id, val, catName, subName);
    }
  });

  return roots;
}

export async function getIncomeTreemapData(
  competencyMonth: string,
  dateMode: "due_date" | "launch_date" = "due_date",
): Promise<TreemapDataSets> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;
  const userCards = await db
    .select({ id: creditCards.id, dueDay: creditCards.dueDay, closingDay: creditCards.closingDay })
    .from(creditCards)
    .where(eq(creditCards.userId, userId));
  const condition = buildGlobalCompetencyCondition(competencyMonth, closingDay, userId, userCards, dateMode);

  const rawTransactions = await db.query.transactions.findMany({
    where: and(eq(transactions.type, "income"), ne(transactions.status, "ignored"), condition),
    with: {
      category: true,
      subcategory: true,
    },
  });

  const roots: TreemapDataSets = {
    all: { name: "Receitas", children: [] },
    variable: { name: "Receitas Variáveis", children: [] },
    installment: { name: "Receitas Parceladas", children: [] },
    fixed: { name: "Receitas Fixas", children: [] },
  };

  const maps = {
    all: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
    variable: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
    installment: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
    fixed: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
  };

  const addToTree = (
    treeType: keyof TreemapDataSets,
    desc: string,
    id: string | number,
    val: number,
    catName: string,
    subName: string,
  ) => {
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

  rawTransactions.forEach((t) => {
    const catName = t.category?.name || "Sem Categoria";
    const subName = t.subcategory?.name || "Geral";
    const val = Number(t.amount);

    const isInstallment = t.installmentTotal && t.installmentTotal > 1;
    const isFixed = t.fixedTransactionId || t.isFixed;

    addToTree("all", t.description, t.id, val, catName, subName);

    if (isInstallment) {
      addToTree("installment", t.description, t.id, val, catName, subName);
    } else if (isFixed) {
      addToTree("fixed", t.description, t.id, val, catName, subName);
    } else {
      addToTree("variable", t.description, t.id, val, catName, subName);
    }
  });

  return roots;
}

export async function getExpensesForecastData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const currentMonthDate = new Date();
  const currentMonth = format(currentMonthDate, "yyyy-MM");

  const startMonthDate = subMonths(currentMonthDate, 5);
  const startMonth = format(startMonthDate, "yyyy-MM");

  const endMonthDate = addMonths(currentMonthDate, 6);
  const endMonth = format(endMonthDate, "yyyy-MM");

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
        inArray(transactions.type, ["expense", "credit_card_expense"]),
        gte(transactions.competencyMonth, startMonth),
        lte(transactions.competencyMonth, endMonth),
        ne(transactions.status, "ignored"),
        eq(transactions.userId, userId),
      ),
    );

  const activeFixed = await db
    .select({
      id: fixedTransactions.id,
      amount: fixedTransactions.amount,
      startDate: fixedTransactions.startDate,
    })
    .from(fixedTransactions)
    .where(
      and(
        eq(fixedTransactions.active, true),
        inArray(fixedTransactions.type, ["expense", "credit_card_expense"]),
        eq(fixedTransactions.userId, userId),
      ),
    );

  const monthKeys: string[] = [];
  for (let i = -5; i <= 6; i++) {
    monthKeys.push(
      format(
        i === 0 ? currentMonthDate : i > 0 ? addMonths(currentMonthDate, i) : subMonths(currentMonthDate, Math.abs(i)),
        "yyyy-MM",
      ),
    );
  }

  const monthlyData: Record<string, { Parcelas: number; Fixas: number; Variáveis: number; isFuture: boolean }> = {};

  monthKeys.forEach((m) => {
    monthlyData[m] = { Parcelas: 0, Fixas: 0, Variáveis: 0, isFuture: m > currentMonth };
  });

  const materializedFixedIdsByMonth: Record<string, Set<string>> = {};
  monthKeys.forEach((m) => {
    materializedFixedIdsByMonth[m] = new Set();
  });

  allTxs.forEach((t) => {
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

  monthKeys.forEach((m) => {
    if (m >= currentMonth) {
      activeFixed.forEach((ft) => {
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

  const chartData = monthKeys.map((m) => {
    const date = new Date(`${m}-01T00:00:00`);
    const formattedMonth = format(date, "MMM/yyyy", { locale: ptBR });
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
  const currentMonth = format(currentMonthDate, "yyyy-MM");

  const startMonthDate = subMonths(currentMonthDate, 5);
  const startMonth = format(startMonthDate, "yyyy-MM");

  const endMonthDate = addMonths(currentMonthDate, 6);
  const endMonth = format(endMonthDate, "yyyy-MM");

  const allTxs = await db.query.transactions.findMany({
    where: and(
      inArray(transactions.type, ["expense", "credit_card_expense"]),
      gte(transactions.competencyMonth, startMonth),
      lte(transactions.competencyMonth, endMonth),
      ne(transactions.status, "ignored"),
      eq(transactions.userId, userId),
    ),
    with: {
      category: true,
    },
  });

  const activeFixed = await db.query.fixedTransactions.findMany({
    where: and(
      eq(fixedTransactions.active, true),
      inArray(fixedTransactions.type, ["expense", "credit_card_expense"]),
      eq(fixedTransactions.userId, userId),
    ),
    with: {
      category: true,
    },
  });

  const monthKeys: string[] = [];
  for (let i = -5; i <= 6; i++) {
    monthKeys.push(
      format(
        i === 0 ? currentMonthDate : i > 0 ? addMonths(currentMonthDate, i) : subMonths(currentMonthDate, Math.abs(i)),
        "yyyy-MM",
      ),
    );
  }

  const variableExpensesByCategory: Record<string, Record<string, number>> = {};
  const monthlyData: Record<string, Record<string, number | string | boolean>> = {};

  monthKeys.forEach((m) => {
    monthlyData[m] = { rawMonth: m, isFuture: m > currentMonth };
  });

  const materializedFixedIdsByMonth: Record<string, Set<string>> = {};
  monthKeys.forEach((m) => {
    materializedFixedIdsByMonth[m] = new Set();
  });

  const categoryKeys = new Set<string>();
  const getCatName = (cat: { name: string } | null | undefined) => cat?.name || "Sem Categoria";

  allTxs.forEach((t) => {
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
      if (!variableExpensesByCategory[catName][t.competencyMonth])
        variableExpensesByCategory[catName][t.competencyMonth] = 0;
      variableExpensesByCategory[catName][t.competencyMonth] += amt;
    }
  });

  monthKeys.forEach((m) => {
    if (m >= currentMonth) {
      activeFixed.forEach((ft) => {
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

  categoryKeys.forEach((catName) => {
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

  const sortedCategoryKeys = Array.from(categoryKeys).sort((a, b) => {
    let activeMonthsA = 0;
    let activeMonthsB = 0;
    let totalA = 0;
    let totalB = 0;
    let lastActiveIdxA = -1;
    let lastActiveIdxB = -1;

    monthKeys.forEach((m, idx) => {
      const valA = typeof monthlyData[m]?.[a] === "number" ? Number(monthlyData[m][a]) : 0;
      const valB = typeof monthlyData[m]?.[b] === "number" ? Number(monthlyData[m][b]) : 0;
      if (valA > 0) {
        activeMonthsA += 1;
        totalA += valA;
        lastActiveIdxA = idx;
      }
      if (valB > 0) {
        activeMonthsB += 1;
        totalB += valB;
        lastActiveIdxB = idx;
      }
    });

    if (lastActiveIdxA !== lastActiveIdxB) {
      return lastActiveIdxB - lastActiveIdxA;
    }
    if (activeMonthsA !== activeMonthsB) {
      return activeMonthsB - activeMonthsA;
    }
    return totalB - totalA;
  });

  const chartData = monthKeys.map((m) => {
    const date = new Date(`${m}-01T00:00:00`);
    const formattedMonth = format(date, "MMM/yyyy", { locale: ptBR });
    return {
      month: formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1),
      ...monthlyData[m],
    };
  });

  return {
    data: chartData,
    keys: sortedCategoryKeys,
  };
}
