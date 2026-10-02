"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { accounts, categories, fixedTransactions, loans, settings, transactions } from "@/db/schema";
import { addMonths, format, getDate, parseISO } from "date-fns";
import { and, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type Transaction = typeof transactions.$inferSelect;

export type CreateLoanInput = {
  name: string;
  type: "bank" | "personal";
  totalAmount: number;
  interestRate: number; // default 0
  installments: number;
  date: string; // Data inicial, YYYY-MM-DD
  alreadyReceived?: boolean;

  // Se bank
  bankIncomeAccountId?: number; // Onde cai o dinheiro
  bankExpenseAccountId?: number; // Se debitado em conta
  bankCreditCardId?: number; // Se pago no cartão
  categoryId?: number;
  subcategoryId?: number | null;
  firstInvoiceMonth?: string; // Se pago no cartão, qual a primeira fatura (YYYY-MM)

  // Se personal
  reserveAccountId?: number; // De onde sai
  checkingAccountId?: number; // Para onde vai
};

function getCompetencyMonth(date: Date, closingDay: number): string {
  const day = getDate(date);
  if (day > closingDay) {
    return format(addMonths(date, 1), "yyyy-MM");
  }
  return format(date, "yyyy-MM");
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function applyBalanceDelta(
  tx: DbTransaction,
  accountId: number | null | undefined,
  amount: number | string,
  type: string,
  status: string,
  parentTransactionId?: number | null,
) {
  if (!accountId || status !== "paid") return;

  let delta = 0;
  const numAmount = Number(amount);

  if (type === "income") {
    delta = numAmount;
  } else if (type === "expense" || type === "credit_card_expense") {
    delta = -numAmount;
  } else if (type === "transfer") {
    if (!parentTransactionId) {
      delta = -numAmount; // Saída
    } else {
      delta = numAmount; // Entrada
    }
  }

  if (delta === 0) return;

  await tx
    .update(accounts)
    .set({ currentBalance: sql`${accounts.currentBalance} + ${delta}` })
    .where(eq(accounts.id, accountId));
}

async function getTransferCategoryId(tx: DbTransaction, userId: string) {
  const [cat] = await tx
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.type, "transfer")))
    .limit(1);
  if (cat) return cat.id;

  const [newCat] = await tx
    .insert(categories)
    .values({ userId, name: "Transferência", type: "transfer", icon: "arrow-right-left" })
    .returning();
  return newCat.id;
}

export async function createLoan(input: CreateLoanInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const userSettings = await db.query.settings.findFirst({
    where: eq(settings.userId, userId),
  });
  const closingDay = userSettings?.closingDay || 1;

  await db.transaction(async (tx) => {
    // 1. Inserir registro matriz
    const [loan] = await tx
      .insert(loans)
      .values({
        userId,
        name: input.name,
        type: input.type,
        totalAmount: input.totalAmount.toString(),
        interestRate: input.interestRate.toString(),
        installments: input.installments,
      })
      .returning();

    const principal = input.totalAmount;
    const rate = input.interestRate / 100;

    if (input.type === "bank") {
      if (!input.categoryId) {
        throw new Error("Missing required fields for bank loan");
      }
      if (!input.alreadyReceived && !input.bankIncomeAccountId) {
        throw new Error("Missing bankIncomeAccountId for bank loan");
      }

      const parsedDate = parseISO(input.date);
      const competencyMonth = getCompetencyMonth(parsedDate, closingDay);

      // Entrada na conta destino (apenas se não foi recebido previamente)
      if (!input.alreadyReceived && input.bankIncomeAccountId) {
        await tx
          .insert(transactions)
          .values({
            userId,
            loanId: loan.id,
            type: "income",
            status: "paid",
            amount: principal.toString(),
            description: `Empréstimo: ${input.name}`,
            dueDate: input.date,
            launchDate: input.date,
            competencyMonth,
            accountId: input.bankIncomeAccountId,
            categoryId: input.categoryId,
            subcategoryId: input.subcategoryId || null,
            paidAt: new Date(),
          })
          .returning();

        await applyBalanceDelta(tx, input.bankIncomeAccountId, principal, "income", "paid");
      }

      const installmentBase = principal / input.installments;
      const installmentValue = rate > 0 ? installmentBase * (1 + rate) : installmentBase;
      const isCreditCard = !!input.bankCreditCardId;

      let parentId: number | null = null;

      for (let i = 1; i <= input.installments; i++) {
        const currentDate = addMonths(parsedDate, i - 1);
        const dateStr = format(currentDate, "yyyy-MM-dd");
        const currentCompetency = getCompetencyMonth(currentDate, closingDay);

        let invoiceMonth = null;
        if (isCreditCard && input.firstInvoiceMonth) {
          const firstInvDate = parseISO(`${input.firstInvoiceMonth}-01`);
          invoiceMonth = format(addMonths(firstInvDate, i - 1), "yyyy-MM");
        }

        const [expenseTx]: Transaction[] = await tx
          .insert(transactions)
          .values({
            userId,
            loanId: loan.id,
            type: isCreditCard ? "credit_card_expense" : "expense",
            status: "pending",
            amount: installmentValue.toString(),
            description: `Parcela ${i}/${input.installments} - ${input.name}`,
            dueDate: dateStr,
            launchDate: dateStr,
            competencyMonth: isCreditCard && invoiceMonth ? invoiceMonth : currentCompetency,
            accountId: isCreditCard ? null : input.bankExpenseAccountId,
            creditCardId: isCreditCard ? input.bankCreditCardId : null,
            categoryId: input.categoryId,
            subcategoryId: input.subcategoryId || null,
            installmentCurrent: i,
            installmentTotal: input.installments,
            invoiceMonth,
            installmentParentId: parentId,
          })
          .returning();

        if (i === 1) {
          parentId = expenseTx.id;
        }
      }
    } else if (input.type === "personal") {
      if (!input.reserveAccountId || !input.checkingAccountId) {
        throw new Error("Missing required fields for personal loan");
      }

      const parsedDate = parseISO(input.date);
      const competencyMonth = getCompetencyMonth(parsedDate, closingDay);
      const transferCategoryId = await getTransferCategoryId(tx, userId);

      // Apenas realiza a transferência inicial se NÃO foi recebido previamente
      if (!input.alreadyReceived) {
        // Saída da Reserva
        const [transferOut] = await tx
          .insert(transactions)
          .values({
            userId,
            loanId: loan.id,
            type: "transfer",
            status: "paid",
            amount: principal.toString(),
            description: `Empréstimo concedido: ${input.name} (Saída)`,
            dueDate: input.date,
            launchDate: input.date,
            competencyMonth,
            accountId: input.reserveAccountId,
            categoryId: transferCategoryId,
            paidAt: new Date(),
          })
          .returning();

        await applyBalanceDelta(tx, input.reserveAccountId, principal, "transfer", "paid", null);

        // Entrada na Corrente
        await tx
          .insert(transactions)
          .values({
            userId,
            loanId: loan.id,
            type: "transfer",
            status: "paid",
            amount: principal.toString(),
            description: `Empréstimo concedido: ${input.name} (Entrada)`,
            dueDate: input.date,
            launchDate: input.date,
            competencyMonth,
            accountId: input.checkingAccountId,
            categoryId: transferCategoryId,
            parentTransactionId: transferOut.id,
            paidAt: new Date(),
          })
          .returning();

        await applyBalanceDelta(tx, input.checkingAccountId, principal, "transfer", "paid", transferOut.id);
      }

      const installmentBase = principal / input.installments;
      const installmentValue = rate > 0 ? installmentBase * (1 + rate) : installmentBase;

      let devOutParentId: number | null = null;
      let devInParentId: number | null = null;

      for (let i = 1; i <= input.installments; i++) {
        // Devoluções começam no mês seguinte (addMonths(..., i))
        const currentDate = addMonths(parsedDate, i);
        const dateStr = format(currentDate, "yyyy-MM-dd");
        const currentCompetency = getCompetencyMonth(currentDate, closingDay);

        const [devOut]: Transaction[] = await tx
          .insert(transactions)
          .values({
            userId,
            loanId: loan.id,
            type: "transfer",
            status: "pending",
            amount: installmentValue.toString(),
            description: `Devolução ${i}/${input.installments} - ${input.name} (Saída)`,
            dueDate: dateStr,
            launchDate: dateStr,
            competencyMonth: currentCompetency,
            accountId: input.checkingAccountId,
            categoryId: transferCategoryId,
            installmentCurrent: i,
            installmentTotal: input.installments,
            installmentParentId: devOutParentId,
          })
          .returning();

        const [devIn]: Transaction[] = await tx
          .insert(transactions)
          .values({
            userId,
            loanId: loan.id,
            type: "transfer",
            status: "pending",
            amount: installmentValue.toString(),
            description: `Devolução ${i}/${input.installments} - ${input.name} (Entrada)`,
            dueDate: dateStr,
            launchDate: dateStr,
            competencyMonth: currentCompetency,
            accountId: input.reserveAccountId,
            categoryId: transferCategoryId,
            parentTransactionId: devOut.id,
            installmentCurrent: i,
            installmentTotal: input.installments,
            installmentParentId: devInParentId,
          })
          .returning();

        if (i === 1) {
          devOutParentId = devOut.id;
          devInParentId = devIn.id;
        }
      }
    }
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/loans");
}

export type OriginAccountProgressionMonth = {
  month: string;
  startingBalance: number;
  loanReimbursements: number;
  otherIncomes: number;
  otherOutflows: number;
  netMonth: number;
  projectedBalance: number;
  loanItems: Array<{ description: string; amount: number }>;
  otherItems: Array<{ description: string; amount: number }>;
};

export type LoanOriginAccount = {
  accountId: number;
  accountName: string;
  accountType: string;
  currentBalance: number;
  totalOwed: number;
  totalPaid: number;
  otherRevenuesTotal: number;
  finalProjectedBalance: number;
  loansCount: number;
  associatedLoans: Array<{ id: string; name: string; remaining: number }>;
  monthlyProgression: OriginAccountProgressionMonth[];
};

export type EnrichedLoanOriginAccountSummary = {
  id: number;
  name: string;
  type: string;
  currentBalance: number;
  totalOwed: number;
  finalProjectedBalance: number;
};

export async function getLoansPageData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const userSettings = await db.query.settings.findFirst({
    where: eq(settings.userId, userId),
  });
  const closingDay = userSettings?.closingDay || 1;

  const userLoans = await db.select().from(loans).where(eq(loans.userId, userId)).orderBy(loans.createdAt);

  if (userLoans.length === 0) {
    return {
      loans: [],
      bankDebtTotal: 0,
      personalDebtTotal: 0,
      amortizationData: [],
      closingDay,
      originAccounts: [],
    };
  }

  const loanIds = userLoans.map((l) => l.id);

  // Fetch all transactions linked to loans
  const allLoanTransactions = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), inArray(transactions.loanId, loanIds)));

  // For bank loans: expense/credit_card_expense transactions
  // For personal loans: transfer transactions that are "saída" (no parentTransactionId = origin transfer out)
  const loanTransactions = allLoanTransactions.filter(
    (tx) => tx.type !== "income" && tx.parentTransactionId === null && tx.installmentTotal !== null,
  );

  const loanDataMap = new Map<
    string,
    {
      totalToPay: number;
      totalPaid: number;
      pendingByMonth: Map<string, number>;
      installments: Array<{
        id: number;
        amount: number;
        date: string;
        competencyMonth: string;
        status: string;
        installmentCurrent: number | null;
        installmentTotal: number | null;
      }>;
    }
  >();

  for (const loan of userLoans) {
    loanDataMap.set(loan.id, {
      totalToPay: 0,
      totalPaid: 0,
      pendingByMonth: new Map(),
      installments: [],
    });
  }

  for (const tx of loanTransactions) {
    if (!tx.loanId) continue;
    const data = loanDataMap.get(tx.loanId);
    if (!data) continue;

    const amount = Number(tx.amount);
    data.totalToPay += amount;

    data.installments.push({
      id: tx.id,
      amount,
      date: tx.dueDate,
      competencyMonth: tx.competencyMonth,
      status: tx.status,
      installmentCurrent: tx.installmentCurrent,
      installmentTotal: tx.installmentTotal,
    });

    if (tx.status === "paid") {
      data.totalPaid += amount;
    } else {
      // Group pending amounts by competencyMonth for amortization
      const month = tx.competencyMonth;
      data.pendingByMonth.set(month, (data.pendingByMonth.get(month) || 0) + amount);
    }
  }

  // Map personal loans to their origin account (the account that lent the money)
  const loanOriginAccountIdMap = new Map<string, number>();
  for (const loan of userLoans) {
    if (loan.type === "personal") {
      // Find devIn transaction (the return transfer leg entering into the reserve account)
      const devInTx = allLoanTransactions.find(
        (tx) => tx.loanId === loan.id && tx.type === "transfer" && tx.parentTransactionId !== null,
      );
      if (devInTx?.accountId) {
        loanOriginAccountIdMap.set(loan.id, devInTx.accountId);
      } else {
        // Fallback: check initial transfer out from the reserve account
        const transferOutTx = allLoanTransactions.find(
          (tx) =>
            tx.loanId === loan.id &&
            tx.type === "transfer" &&
            tx.parentTransactionId === null &&
            tx.installmentTotal === null,
        );
        if (transferOutTx?.accountId) {
          loanOriginAccountIdMap.set(loan.id, transferOutTx.accountId);
        }
      }
    }
  }

  const distinctOriginAccountIds = Array.from(new Set(Array.from(loanOriginAccountIdMap.values())));
  const originAccounts: LoanOriginAccount[] = [];
  const loanOriginSummaryMap = new Map<string, EnrichedLoanOriginAccountSummary>();

  if (distinctOriginAccountIds.length > 0) {
    const originAccountsList = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), inArray(accounts.id, distinctOriginAccountIds)));

    const pendingOriginTxs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(transactions.accountId, distinctOriginAccountIds),
          eq(transactions.status, "pending"),
        ),
      );

    const allAccountFixedTxs = await db
      .select({
        competencyMonth: transactions.competencyMonth,
        fixedTransactionId: transactions.fixedTransactionId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(transactions.accountId, distinctOriginAccountIds),
          isNotNull(transactions.fixedTransactionId),
        ),
      );

    const materializedFixed = new Set<string>();
    for (const t of allAccountFixedTxs) {
      if (t.fixedTransactionId && t.competencyMonth) {
        materializedFixed.add(`${t.competencyMonth}-${t.fixedTransactionId}`);
      }
    }

    const activeFixedInflows = await db
      .select()
      .from(fixedTransactions)
      .where(
        and(
          eq(fixedTransactions.userId, userId),
          eq(fixedTransactions.active, true),
          or(
            and(eq(fixedTransactions.type, "income"), inArray(fixedTransactions.accountId, distinctOriginAccountIds)),
            and(
              eq(fixedTransactions.type, "transfer"),
              inArray(fixedTransactions.destinationAccountId, distinctOriginAccountIds),
            ),
          ),
        ),
      );

    const activeFixedOutflows = await db
      .select()
      .from(fixedTransactions)
      .where(
        and(
          eq(fixedTransactions.userId, userId),
          eq(fixedTransactions.active, true),
          or(
            and(eq(fixedTransactions.type, "expense"), inArray(fixedTransactions.accountId, distinctOriginAccountIds)),
            and(eq(fixedTransactions.type, "transfer"), inArray(fixedTransactions.accountId, distinctOriginAccountIds)),
          ),
        ),
      );

    const today = new Date();
    const currentCompetencyMonth = getCompetencyMonth(today, closingDay);

    for (const acc of originAccountsList) {
      const currentBalance = Number(acc.currentBalance);
      const loansForAcc = userLoans.filter((l) => loanOriginAccountIdMap.get(l.id) === acc.id);
      const loanIdsForAcc = new Set(loansForAcc.map((l) => l.id));

      const pendingLoanReturns = pendingOriginTxs.filter(
        (t) => t.loanId && loanIdsForAcc.has(t.loanId) && t.type === "transfer" && t.parentTransactionId !== null,
      );
      const totalOwed = pendingLoanReturns.reduce((sum, t) => sum + Number(t.amount), 0);

      const paidLoanReturns = allLoanTransactions.filter(
        (t) =>
          t.loanId &&
          loanIdsForAcc.has(t.loanId) &&
          t.type === "transfer" &&
          t.parentTransactionId !== null &&
          t.status === "paid",
      );
      const totalPaid = paidLoanReturns.reduce((sum, t) => sum + Number(t.amount), 0);

      const otherPendingTxs = pendingOriginTxs.filter((t) => !t.loanId || !loanIdsForAcc.has(t.loanId));

      const returnMonths = pendingLoanReturns.map((t) => t.competencyMonth).filter(Boolean);
      let minMonth = currentCompetencyMonth;
      let maxMonth = currentCompetencyMonth;
      for (const m of returnMonths) {
        if (m < minMonth) minMonth = m;
        if (m > maxMonth) maxMonth = m;
      }

      // Check for overdue pending non-loan transactions before minMonth
      let runningBalance = currentBalance;
      const overduePendingTxs = otherPendingTxs.filter((t) => t.competencyMonth < minMonth);
      for (const t of overduePendingTxs) {
        const amt = Number(t.amount);
        if (t.type === "income" || (t.type === "transfer" && t.parentTransactionId !== null)) {
          runningBalance += amt;
        } else if (t.type === "expense" || (t.type === "transfer" && t.parentTransactionId === null)) {
          runningBalance -= amt;
        }
      }

      let cursorDate = parseISO(`${minMonth}-01`);
      const endDate = parseISO(`${maxMonth}-01`);
      const monthlyProgression: OriginAccountProgressionMonth[] = [];
      let otherRevenuesTotal = 0;

      while (cursorDate <= endDate) {
        const monthStr = format(cursorDate, "yyyy-MM");

        // 1. Loan reimbursements in monthStr
        const monthLoanTxs = pendingLoanReturns.filter((t) => t.competencyMonth === monthStr);
        const loanAmt = monthLoanTxs.reduce((sum, t) => sum + Number(t.amount), 0);
        const loanItems = monthLoanTxs.map((t) => ({
          description: t.description,
          amount: Number(t.amount),
        }));

        // 2. Other incomes in monthStr
        let monthOtherIncomes = 0;
        const otherItems: Array<{ description: string; amount: number }> = [];

        // Real pending inflows
        const monthPendingInflows = otherPendingTxs.filter(
          (t) =>
            t.competencyMonth === monthStr &&
            (t.type === "income" || (t.type === "transfer" && t.parentTransactionId !== null)),
        );
        for (const t of monthPendingInflows) {
          const amt = Number(t.amount);
          monthOtherIncomes += amt;
          otherItems.push({
            description: t.description,
            amount: amt,
          });
        }

        // Virtual fixed inflows
        for (const ft of activeFixedInflows) {
          if (ft.accountId === acc.id || ft.destinationAccountId === acc.id) {
            const ftStartMonth = ft.startDate.substring(0, 7);
            if (monthStr >= ftStartMonth && !materializedFixed.has(`${monthStr}-${ft.id}`)) {
              const amt = Number(ft.amount);
              monthOtherIncomes += amt;
              otherItems.push({
                description: `${ft.description} (Fixo)`,
                amount: amt,
              });
            }
          }
        }

        // 3. Other outflows in monthStr
        let monthOtherOutflows = 0;
        const monthPendingOutflows = otherPendingTxs.filter(
          (t) =>
            t.competencyMonth === monthStr &&
            (t.type === "expense" || (t.type === "transfer" && t.parentTransactionId === null)),
        );
        for (const t of monthPendingOutflows) {
          const amt = Number(t.amount);
          monthOtherOutflows += amt;
          otherItems.push({
            description: t.description,
            amount: -amt,
          });
        }

        for (const ft of activeFixedOutflows) {
          if (ft.accountId === acc.id) {
            const ftStartMonth = ft.startDate.substring(0, 7);
            if (monthStr >= ftStartMonth && !materializedFixed.has(`${monthStr}-${ft.id}`)) {
              const amt = Number(ft.amount);
              monthOtherOutflows += amt;
              otherItems.push({
                description: `${ft.description} (Fixo)`,
                amount: -amt,
              });
            }
          }
        }

        const netMonth = loanAmt + monthOtherIncomes - monthOtherOutflows;
        const startBal = runningBalance;
        runningBalance += netMonth;
        otherRevenuesTotal += monthOtherIncomes - monthOtherOutflows;

        monthlyProgression.push({
          month: monthStr,
          startingBalance: Math.round(startBal * 100) / 100,
          loanReimbursements: Math.round(loanAmt * 100) / 100,
          otherIncomes: Math.round(monthOtherIncomes * 100) / 100,
          otherOutflows: Math.round(monthOtherOutflows * 100) / 100,
          netMonth: Math.round(netMonth * 100) / 100,
          projectedBalance: Math.round(runningBalance * 100) / 100,
          loanItems,
          otherItems,
        });

        cursorDate = addMonths(cursorDate, 1);
      }

      const finalProjectedBalance = Math.round(runningBalance * 100) / 100;

      originAccounts.push({
        accountId: acc.id,
        accountName: acc.name,
        accountType: acc.type,
        currentBalance: Math.round(currentBalance * 100) / 100,
        totalOwed: Math.round(totalOwed * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        otherRevenuesTotal: Math.round(otherRevenuesTotal * 100) / 100,
        finalProjectedBalance,
        loansCount: loansForAcc.length,
        associatedLoans: loansForAcc.map((l) => {
          const lData = loanDataMap.get(l.id);
          const rem = (lData?.totalToPay ?? 0) - (lData?.totalPaid ?? 0);
          return { id: l.id, name: l.name, remaining: Math.round(rem * 100) / 100 };
        }),
        monthlyProgression,
      });

      for (const l of loansForAcc) {
        loanOriginSummaryMap.set(l.id, {
          id: acc.id,
          name: acc.name,
          type: acc.type,
          currentBalance: Math.round(currentBalance * 100) / 100,
          totalOwed: Math.round(totalOwed * 100) / 100,
          finalProjectedBalance,
        });
      }
    }
  }

  let bankDebtTotal = 0;
  let personalDebtTotal = 0;

  const enrichedLoans = userLoans.map((loan) => {
    const data = loanDataMap.get(loan.id)!;
    const remaining = data.totalToPay - data.totalPaid;
    const progressPercent = data.totalToPay > 0 ? Math.round((data.totalPaid / data.totalToPay) * 100) : 0;

    // Ordenar parcelas pelo número
    data.installments.sort((a, b) => (a.installmentCurrent || 0) - (b.installmentCurrent || 0));

    if (loan.type === "bank") {
      bankDebtTotal += remaining;
    } else {
      personalDebtTotal += remaining;
    }

    return {
      id: loan.id,
      name: loan.name,
      type: loan.type,
      totalAmount: Number(loan.totalAmount),
      interestRate: Number(loan.interestRate),
      installments: loan.installments,
      createdAt: loan.createdAt,
      totalToPay: data.totalToPay,
      totalPaid: data.totalPaid,
      remaining,
      progressPercent,
      installmentList: data.installments,
      originAccount: loanOriginSummaryMap.get(loan.id) ?? null,
    };
  });

  // Build amortization chart data: aggregate all pending amounts by month
  // showing the remaining debt going down to zero
  const allPendingByMonth = new Map<string, { bank: number; personal: number }>();

  for (const loan of userLoans) {
    const data = loanDataMap.get(loan.id)!;
    for (const [month, amount] of data.pendingByMonth) {
      const entry = allPendingByMonth.get(month) || { bank: 0, personal: 0 };
      if (loan.type === "bank") {
        entry.bank += amount;
      } else {
        entry.personal += amount;
      }
      allPendingByMonth.set(month, entry);
    }
  }

  // Sort months and compute running balance (debt goes down as months pass)
  const sortedMonths = Array.from(allPendingByMonth.keys()).sort();

  let runningBank = bankDebtTotal;
  let runningPersonal = personalDebtTotal;

  const amortizationData = sortedMonths.map((month) => {
    const entry = allPendingByMonth.get(month)!;
    // The chart starts at full debt and subtracts payments each month
    const bankBefore = runningBank;
    const personalBefore = runningPersonal;

    runningBank -= entry.bank;
    runningPersonal -= entry.personal;

    return {
      month,
      "Dívida Externa": Math.max(0, Math.round(bankBefore * 100) / 100),
      "Dívida Interna": Math.max(0, Math.round(personalBefore * 100) / 100),
    };
  });

  // Add the final zero point
  if (sortedMonths.length > 0) {
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    const lastDate = parseISO(`${lastMonth}-01`);
    const finalMonth = format(addMonths(lastDate, 1), "yyyy-MM");
    amortizationData.push({
      month: finalMonth,
      "Dívida Externa": Math.max(0, Math.round(runningBank * 100) / 100),
      "Dívida Interna": Math.max(0, Math.round(runningPersonal * 100) / 100),
    });
  }

  return {
    loans: enrichedLoans,
    bankDebtTotal: Math.round(bankDebtTotal * 100) / 100,
    personalDebtTotal: Math.round(personalDebtTotal * 100) / 100,
    amortizationData,
    closingDay,
    originAccounts,
  };
}

export async function updateInstallmentDate(transactionId: number, date: string, competencyMonth: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // Atualizar a própria transação
  await db
    .update(transactions)
    .set({ dueDate: date, launchDate: date, competencyMonth })
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

  // Se a transação for a perna "out" de um personal loan, precisamos atualizar a perna "in"
  // E também o inverso. Mas a UI mostra a perna "out" que foi buscada.
  // Procuramos qualquer transação que tenha essa transação como parent (ou vice-versa)

  // Buscar se tem filhas
  await db
    .update(transactions)
    .set({ dueDate: date, launchDate: date, competencyMonth })
    .where(and(eq(transactions.parentTransactionId, transactionId), eq(transactions.userId, userId)));

  // Buscar se é filha (para atualizar a mãe também, mantendo a consistência do dia)
  const [tx] = await db.select().from(transactions).where(eq(transactions.id, transactionId));
  if (tx?.parentTransactionId) {
    await db
      .update(transactions)
      .set({ dueDate: date, launchDate: date, competencyMonth })
      .where(and(eq(transactions.id, tx.parentTransactionId), eq(transactions.userId, userId)));
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/loans");
}
