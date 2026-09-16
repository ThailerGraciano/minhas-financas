"use server";

import { getHistoricalBalance } from "@/app/actions/accounts";
import { auth } from "@/auth";
import { db } from "@/db";
import { accounts, creditCards, fixedTransactions, settings, transactions } from "@/db/schema";
import { getTargetInvoiceMonth } from "@/lib/competency-utils";
import { getDefaultCompetencyMonth } from "@/lib/date-utils";
import { addDays, addMonths, differenceInDays, format, lastDayOfMonth, parseISO } from "date-fns";
import { and, asc, eq, gt, gte, inArray, isNotNull, lte, ne, or, sql, SQL } from "drizzle-orm";

export async function getProjectedCashFlow(accountId?: string, reqCompetencyMonth?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;

  const currentCompMonth = getDefaultCompetencyMonth(closingDay);
  const competencyMonth = reqCompetencyMonth || currentCompMonth;

  // Calculate startDate and endDate for the requested competency
  const [yearStr, monthStr] = competencyMonth.split("-");
  const year = parseInt(yearStr);
  const monthIndex = parseInt(monthStr) - 1;

  // End date is closingDay of the competency month
  const lastDayOfCompMonth = lastDayOfMonth(new Date(year, monthIndex, 1)).getDate();
  const safeEndDay = Math.min(closingDay, lastDayOfCompMonth);
  const targetEndDateStr = `${competencyMonth}-${String(safeEndDay).padStart(2, "0")}`;
  const targetEndDate = parseISO(targetEndDateStr);

  // Start date is closingDay + 1 of the PREVIOUS month
  const prevMonthDate = new Date(year, monthIndex - 1, 1);
  const lastDayOfPrevMonth = lastDayOfMonth(prevMonthDate).getDate();
  const safeStartDay = Math.min(closingDay, lastDayOfPrevMonth) + 1;

  const targetStartDateObj = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), safeStartDay);
  const targetStartDateStr = format(targetStartDateObj, "yyyy-MM-dd");
  const targetStartDate = parseISO(targetStartDateStr);

  const baseDate = new Date();
  const todayDate = format(baseDate, "yyyy-MM-dd");
  const todayParsed = parseISO(todayDate);

  let allAccounts;
  if (accountId === "checking_accounts") {
    allAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.type, "checking"), eq(accounts.userId, userId)));
  } else if (accountId) {
    allAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, Number(accountId)), eq(accounts.userId, userId)));
  } else {
    allAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  let currentBalance = 0;
  let startProjectionDateParsed = todayParsed;
  let startProjectionDateStr = todayDate;

  // Se a competência solicitada for igual ou anterior à atual, projetamos a partir de hoje
  // Se for futura, projetamos a partir do start_date
  const isFutureCompetency = targetStartDateStr > todayDate;

  if (!isFutureCompetency) {
    currentBalance = allAccounts.reduce((acc, curr) => acc + Number(curr.currentBalance), 0);
    startProjectionDateParsed = todayParsed;
    startProjectionDateStr = todayDate;
  } else {
    const dayBeforeStart = addDays(targetStartDate, -1);
    let totalHistBalance = 0;
    for (const acc of allAccounts) {
      const histBal = await getHistoricalBalance(acc.id, dayBeforeStart);
      totalHistBalance += histBal || 0;
    }
    currentBalance = totalHistBalance;
    startProjectionDateParsed = targetStartDate;
    startProjectionDateStr = targetStartDateStr;
  }

  // Limitar se o end date for menor que o start date (ex: competência passada, o hoje já passou do end date)
  const diffDays = Math.max(0, differenceInDays(targetEndDate, startProjectionDateParsed));

  // 2. Busca Ampla: Buscar TODAS as transações normais na janela da competência (EXCLUINDO CARTÃO)
  const broadConditions: (SQL | undefined)[] = [
    eq(transactions.userId, userId),
    lte(transactions.date, targetEndDateStr),
    ne(transactions.type, "credit_card_expense"),
  ];

  if (isFutureCompetency) {
    broadConditions.push(
      or(gte(transactions.date, targetStartDateStr), eq(transactions.competencyMonth, competencyMonth)),
    );
  } else {
    // Se for atual, pega a janela inteira E as pendentes atrasadas
    broadConditions.push(
      or(
        gte(transactions.date, targetStartDateStr),
        eq(transactions.status, "pending"),
        eq(transactions.competencyMonth, competencyMonth),
      ),
    );
  }

  let isCheckingAccount = false;
  if (accountId === "checking_accounts" || (allAccounts.length === 1 && allAccounts[0].type === "checking")) {
    isCheckingAccount = true;
  } else if (accountId && accountId !== "all") {
    const acc = allAccounts.find((a) => a.id === Number(accountId));
    if (acc?.type === "checking") isCheckingAccount = true;
  }

  if (accountId) {
    if (accountId === "checking_accounts") {
      const checkingIds = allAccounts.map((a) => a.id);
      if (checkingIds.length > 0) {
        broadConditions.push(inArray(transactions.accountId, checkingIds));
      } else {
        broadConditions.push(eq(transactions.id, -1)); // Force no results
      }
    } else {
      broadConditions.push(eq(transactions.accountId, Number(accountId)));
    }
  }

  const userCards = await db.query.creditCards.findMany({
    where: eq(creditCards.userId, session.user.id),
    columns: { id: true, dueDay: true, closingDay: true, name: true },
  });

  const allTxs = await db.query.transactions.findMany({
    where: and(...broadConditions),
    with: {
      category: true,
      account: true,
      creditCard: true,
    },
    orderBy: [asc(transactions.date)],
  });

  // 2.1 Deduplicação Correta: Coletar os fixedTransactionIds de TUDO (incluindo 'paid') na competência
  const materializedFixedIds = new Set<string>();
  for (const tx of allTxs) {
    // Consideramos apenas as que estão dentro da janela da competência para deduplicar
    if (tx.fixedTransactionId && tx.date >= targetStartDateStr && tx.date <= targetEndDateStr) {
      materializedFixedIds.add(tx.fixedTransactionId);
    }
  }

  // Deduplicação de cartão de crédito: buscar fixedTransactionIds de despesas de cartão no ciclo
  const ccFixedTxs = await db
    .select({
      fixedTransactionId: transactions.fixedTransactionId,
      date: transactions.date,
      invoiceMonth: transactions.invoiceMonth,
      competencyMonth: transactions.competencyMonth,
      creditCardId: transactions.creditCardId,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "credit_card_expense"),
        isNotNull(transactions.fixedTransactionId),
      ),
    );

  const targetInvoiceMonths = new Set<string>([competencyMonth]);
  for (const card of userCards) {
    targetInvoiceMonths.add(getTargetInvoiceMonth(competencyMonth, closingDay, card.dueDay));
  }

  for (const tx of ccFixedTxs) {
    if (tx.fixedTransactionId) {
      if (
        (tx.date >= targetStartDateStr && tx.date <= targetEndDateStr) ||
        tx.competencyMonth === competencyMonth ||
        (tx.invoiceMonth && targetInvoiceMonths.has(tx.invoiceMonth))
      ) {
        materializedFixedIds.add(tx.fixedTransactionId);
      }
    }
  }

  // 2.2 Geração das Virtuais
  const activeFixed = await db
    .select()
    .from(fixedTransactions)
    .where(
      and(
        eq(fixedTransactions.active, true),
        eq(fixedTransactions.userId, userId),
        lte(fixedTransactions.startDate, targetEndDateStr),
      ),
    );

  type TransactionItem = (typeof allTxs)[0];
  const virtualTxs: TransactionItem[] = [];
  for (const ft of activeFixed) {
    // Filter by account
    if (accountId) {
      if (accountId === "checking_accounts") {
        const checkingIds = allAccounts.map((a) => a.id);
        if (ft.type !== "credit_card_expense" && (!ft.accountId || !checkingIds.includes(ft.accountId))) continue;
      } else if (isCheckingAccount) {
        if (ft.type !== "credit_card_expense" && ft.accountId !== Number(accountId)) continue;
      } else {
        if (ft.accountId !== Number(accountId)) continue;
      }
    }

    if (materializedFixedIds.has(ft.id)) continue;

    const ftStartDate = new Date(ft.startDate);
    const cursor = new Date(targetStartDateStr + "T00:00:00");
    cursor.setDate(ftStartDate.getDate());

    if (format(cursor, "yyyy-MM-dd") < targetStartDateStr) {
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const card = ft.creditCardId ? userCards.find((c) => c.id === ft.creditCardId) : undefined;
    const cardClosingDay = card?.closingDay ?? closingDay;

    while (cursor <= targetEndDate) {
      const virtDateStr = format(cursor, "yyyy-MM-dd");

      let virtInvoiceMonth: string | null = null;
      if (ft.type === "credit_card_expense") {
        if (cursor.getDate() > cardClosingDay) {
          virtInvoiceMonth = format(addMonths(cursor, 1), "yyyy-MM");
        } else {
          virtInvoiceMonth = format(cursor, "yyyy-MM");
        }
      }

      virtualTxs.push({
        id: -Math.floor(Math.random() * 1000000), // virtual id
        type: ft.type,
        amount: ft.amount,
        date: virtDateStr,
        description: ft.description + " (Projetada)",
        accountId: ft.accountId,
        creditCardId: ft.creditCardId,
        categoryId: ft.categoryId,
        subcategoryId: ft.subcategoryId,
        userId: ft.userId,
        status: "pending",
        competencyMonth: format(cursor, "yyyy-MM"),
        invoiceMonth: virtInvoiceMonth,
        isFixed: false,
        fixedTransactionId: ft.id,
        installmentCurrent: null,
        installmentTotal: null,
        parentTransactionId: null,
        installmentParentId: null,
        observations: null,
        paidAt: null,
        importHash: null,
        loanId: null,
        category: {
          id: ft.categoryId,
          name: "Virtual",
          userId: ft.userId,
          type: ft.type,
          icon: "virtual",
          isPredictable: false,
        },
        account: null,
        creditCard: null,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const mergedTxs = [...allTxs, ...virtualTxs].sort((a, b) => a.date.localeCompare(b.date));

  // 2.3 Filtro Final em Memória: Manter apenas pending para projeção e atrasadas
  // As 'paid' já cumpriram seu papel na deduplicação
  const finalPendingTxs = mergedTxs.filter((tx) => tx.status === "pending");

  // 2.5 Buscar e agrupar faturas de cartão de crédito pendentes
  const processedTxs: typeof finalPendingTxs = [];
  const pendingCCTxs: typeof finalPendingTxs = [];

  // Extrair as virtuais de cartão de crédito de finalPendingTxs e separar do resto
  for (const tx of finalPendingTxs) {
    if (tx.type === "credit_card_expense") {
      pendingCCTxs.push(tx);
    } else {
      processedTxs.push(tx);
    }
  }

  const includeCreditCards = !accountId || accountId === "all" || isCheckingAccount;

  if (includeCreditCards) {
    // Buscar também as transações pendentes reais do banco de dados
    const dbPendingCCTxs = await db.query.transactions.findMany({
      where: and(
        eq(transactions.userId, userId),
        eq(transactions.type, "credit_card_expense"),
        eq(transactions.status, "pending"),
      ),
      with: {
        category: true,
        account: true,
        creditCard: true,
      },
    });

    // Identificar faturas que já foram pagas no banco de dados para evitar projeções fantasmas
    const paidInvoiceTransfers = await db
      .select({
        creditCardId: transactions.creditCardId,
        competencyMonth: transactions.competencyMonth,
        description: transactions.description,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "transfer"),
          eq(transactions.status, "paid"),
          or(
            isNotNull(transactions.creditCardId),
            sql`${transactions.description} LIKE 'Pagamento de Fatura%'`,
            sql`${transactions.description} LIKE 'Adiantamento de Fatura%'`,
          ),
        ),
      );

    const paidInvoiceKeys = new Set<string>();
    for (const pit of paidInvoiceTransfers) {
      if (pit.creditCardId && pit.competencyMonth) {
        paidInvoiceKeys.add(`${pit.creditCardId}-${pit.competencyMonth}`);
      }
    }

    // Contabilizar quantas transações REAIS pendentes existem por fatura
    const realPendingCountByGroup = new Map<string, number>();
    for (const tx of dbPendingCCTxs) {
      if (!tx.creditCardId) continue;
      const invMonth = tx.invoiceMonth || tx.competencyMonth || tx.date.substring(0, 7);
      const groupKey = `${tx.creditCardId}-${invMonth}`;
      realPendingCountByGroup.set(groupKey, (realPendingCountByGroup.get(groupKey) || 0) + 1);
    }

    pendingCCTxs.push(...dbPendingCCTxs);

    const ccGroups = new Map<string, (typeof processedTxs)[0]>();

    for (const tx of pendingCCTxs) {
      if (!tx.creditCardId) continue;

      const invMonth = tx.invoiceMonth || tx.competencyMonth || tx.date.substring(0, 7);
      const groupKey = `${tx.creditCardId}-${invMonth}`;

      // Se a fatura já foi paga e não há novas transações reais pendentes no banco, ignorar projeção
      const realPendingCount = realPendingCountByGroup.get(groupKey) || 0;
      if (paidInvoiceKeys.has(groupKey) && realPendingCount === 0) {
        continue;
      }

      if (!ccGroups.has(groupKey)) {
        const card = tx.creditCard || userCards.find((c) => c.id === tx.creditCardId);
        const dueDay = card?.dueDay || 10;
        const paymentDate = `${invMonth}-${String(dueDay).padStart(2, "0")}`;

        // Se a data de vencimento da fatura já passou e não há nenhuma transação REAL pendente no banco,
        // não devemos projetar uma dívida fantasma retroativa baseada em virtuais
        if (paymentDate < startProjectionDateStr && realPendingCount === 0) {
          continue;
        }

        ccGroups.set(groupKey, {
          ...tx,
          id: -(tx.creditCardId + 900000 + Math.floor(Math.random() * 10000)),
          type: "expense", // Invoice will manifest as a checking account expense
          amount: "0",
          date: paymentDate,
          description: `Fatura Projetada: ${card?.name || "Cartão"}`,
          invoiceMonth: invMonth,
          isFixed: false,
          fixedTransactionId: null,
          installmentCurrent: null,
          installmentTotal: null,
          parentTransactionId: null,
          installmentParentId: null,
          observations: null,
          paidAt: null,
          importHash: null,
          loanId: null,
          category: {
            id: 0,
            name: "Fatura",
            userId: tx.userId,
            type: "expense",
            icon: "credit-card",
            isPredictable: false,
          },
        });
      }

      const group = ccGroups.get(groupKey);
      if (group) {
        group.amount = String(Number(group.amount) + Number(tx.amount));
      }
    }

    // Apenas inserir a fatura projetada se sua data de vencimento cair dentro da nossa janela de interesse
    for (const group of ccGroups.values()) {
      if (group.date <= targetEndDateStr) {
        if (!isFutureCompetency || group.date >= targetStartDateStr) {
          processedTxs.push(group);
        }
      }
    }
  }

  // Split into overdue (before start projection date) and projected (start projection date and future)
  const overdueTransactions = processedTxs.filter((tx) => tx.date < startProjectionDateStr);
  const futurePendingTxs = processedTxs.filter((tx) => tx.date >= startProjectionDateStr);

  // Apply effect of overdue transactions to initial balance
  for (const tx of overdueTransactions) {
    const amount = Number(tx.amount);
    if (tx.type === "income" || (tx.type === "transfer" && tx.parentTransactionId)) {
      currentBalance += amount;
    } else if (
      tx.type === "expense" ||
      tx.type === "credit_card_expense" ||
      (tx.type === "transfer" && !tx.parentTransactionId)
    ) {
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
    const targetDate = format(addDays(startProjectionDateParsed, i), "yyyy-MM-dd");
    const dailyTxs = grouped.get(targetDate) || [];

    let total_expenses = 0;
    let total_incomes = 0;

    for (const tx of dailyTxs) {
      const amount = Number(tx.amount);
      if (tx.type === "income" || (tx.type === "transfer" && tx.parentTransactionId)) {
        total_incomes += amount;
      } else if (
        tx.type === "expense" ||
        tx.type === "credit_card_expense" ||
        (tx.type === "transfer" && !tx.parentTransactionId)
      ) {
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

  // 5. Generate complete daily chart data (Past + Future)
  const chartData: {
    date: string;
    balancePast: number | null;
    balanceProjected: number | null;
  }[] = [];

  const accountIds = allAccounts.map((a) => a.id);
  const realCurrentBalance = allAccounts.reduce((acc, curr) => acc + Number(curr.currentBalance), 0);

  if (accountIds.length > 0) {
    const hasPastDays = targetStartDateStr <= todayDate;

    if (hasPastDays) {
      const lastPastDateStr = targetEndDateStr < todayDate ? targetEndDateStr : todayDate;
      const lastPastDateParsed = parseISO(lastPastDateStr);

      let balanceAtEnd = realCurrentBalance;
      if (targetEndDateStr < todayDate) {
        const postCompPaidTxs = await db.query.transactions.findMany({
          where: and(
            eq(transactions.userId, userId),
            eq(transactions.status, "paid"),
            gt(transactions.date, targetEndDateStr),
            lte(transactions.date, todayDate),
            inArray(transactions.accountId, accountIds),
            ne(transactions.type, "credit_card_expense"),
          ),
        });
        for (const tx of postCompPaidTxs) {
          const amt = Number(tx.amount);
          if (tx.type === "income" || (tx.type === "transfer" && tx.parentTransactionId)) {
            balanceAtEnd -= amt;
          } else if (tx.type === "expense" || (tx.type === "transfer" && !tx.parentTransactionId)) {
            balanceAtEnd += amt;
          }
        }
      }

      const pastPaidTxs = await db.query.transactions.findMany({
        where: and(
          eq(transactions.userId, userId),
          eq(transactions.status, "paid"),
          gte(transactions.date, targetStartDateStr),
          lte(transactions.date, lastPastDateStr),
          inArray(transactions.accountId, accountIds),
          ne(transactions.type, "credit_card_expense"),
        ),
        orderBy: [asc(transactions.date)],
      });

      const dailyPaidDelta = new Map<string, number>();
      for (const tx of pastPaidTxs) {
        const amt = Number(tx.amount);
        let delta = 0;
        if (tx.type === "income" || (tx.type === "transfer" && tx.parentTransactionId)) {
          delta = amt;
        } else if (tx.type === "expense" || (tx.type === "transfer" && !tx.parentTransactionId)) {
          delta = -amt;
        }
        dailyPaidDelta.set(tx.date, (dailyPaidDelta.get(tx.date) || 0) + delta);
      }

      let totalWindowDelta = 0;
      for (const delta of dailyPaidDelta.values()) {
        totalWindowDelta += delta;
      }

      const startingPastBalance = balanceAtEnd - totalWindowDelta;
      let runningPastBalance = startingPastBalance;

      const pastDaysCount = differenceInDays(lastPastDateParsed, targetStartDate);

      for (let i = 0; i <= pastDaysCount; i++) {
        const dateStr = format(addDays(targetStartDate, i), "yyyy-MM-dd");
        runningPastBalance += dailyPaidDelta.get(dateStr) || 0;

        const isToday = dateStr === todayDate;
        const isJunction = isToday && dateStr <= targetEndDateStr;

        chartData.push({
          date: dateStr,
          balancePast: Math.round(runningPastBalance * 100) / 100,
          balanceProjected: isJunction ? Math.round(runningPastBalance * 100) / 100 : null,
        });
      }
    }

    for (const p of projection) {
      if (p.date > todayDate || (isFutureCompetency && p.date >= targetStartDateStr)) {
        chartData.push({
          date: p.date,
          balancePast: null,
          balanceProjected: Math.round(p.projected_balance * 100) / 100,
        });
      }
    }
  }

  return {
    chartData,
    projection,
    overdueTransactions,
  };
}
