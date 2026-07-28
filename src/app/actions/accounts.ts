"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { accounts, categories, fixedTransactions, transactions } from "@/db/schema";
import { endOfMonth, format, isValid, parse } from "date-fns";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAccounts() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, session.user.id))
    .orderBy(desc(accounts.currentBalance));
}

export async function createAccount(data: Omit<typeof accounts.$inferInsert, "userId">) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    await db.insert(accounts).values({ ...data, userId: session.user.id });
    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    console.error("Error creating account:", error);
    return { success: false, error: "Failed to create account" };
  }
}

export async function updateAccount(id: number, data: Partial<typeof accounts.$inferInsert>) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    await db
      .update(accounts)
      .set(data)
      .where(and(eq(accounts.id, id), eq(accounts.userId, session.user.id)));
    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    console.error("Error updating account:", error);
    return { success: false, error: "Failed to update account" };
  }
}

export async function adjustAccountBalance(
  accountId: number,
  realBalance: number,
  createTransaction: boolean = true,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    // 1. Busca conta e saldo atual
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
    if (!account) {
      return { success: false, error: "Conta não encontrada." };
    }

    const currentBalance = Number(account.currentBalance);
    const diff = realBalance - currentBalance;

    if (diff === 0) {
      return { success: true }; // Nenhum ajuste necessário
    }

    if (createTransaction) {
      // 2. Busca ou cria a categoria de sistema "Ajuste de Saldo"
      const ADJUSTMENT_CATEGORY_NAME = "Ajuste de Saldo";
      const adjustmentType = diff > 0 ? "income" : "expense";

      let [adjustCategory] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.name, ADJUSTMENT_CATEGORY_NAME), eq(categories.userId, userId)))
        .limit(1);

      if (!adjustCategory) {
        [adjustCategory] = await db
          .insert(categories)
          .values({ userId, name: ADJUSTMENT_CATEGORY_NAME, type: adjustmentType, icon: "SlidersHorizontal" })
          .returning();
      }

      // 3. Insere a transação de ajuste (a trigger atualiza o saldo automaticamente)
      const today = format(new Date(), "yyyy-MM-dd");
      const competencyMonth = format(new Date(), "yyyy-MM");

      await db.insert(transactions).values({
        userId,
        type: adjustmentType,
        accountId,
        categoryId: adjustCategory.id,
        amount: Math.abs(diff).toFixed(2),
        description: "Ajuste de saldo",
        date: today,
        competencyMonth,
        status: "paid",
      });
    }

    let finalBalanceToSet = realBalance;

    if (!createTransaction) {
      // User requested formula: "o real já deve considerar o que dei baixa neste mes, assim o ajuste do saldo inical deve ser na verdade 1000 - 150"
      const currentMonth = format(new Date(), "yyyy-MM");
      const accountTransactions = await db.query.transactions.findMany({
        where: and(
          eq(transactions.accountId, accountId),
          eq(transactions.userId, userId),
          eq(transactions.status, 'paid'),
          eq(transactions.competencyMonth, currentMonth)
        )
      });
      
      let paidIncomes = 0;
      let paidExpenses = 0;
      
      for (const tx of accountTransactions) {
        if (tx.type === 'income') {
          paidIncomes += Number(tx.amount);
        } else if (tx.type === 'expense' || tx.type === 'credit_card_expense') {
          paidExpenses += Number(tx.amount);
        }
      }
      
      finalBalanceToSet = realBalance - paidIncomes + paidExpenses;
    }

    // Force update the account balance directly to guarantee sync
    await db
      .update(accounts)
      .set({ currentBalance: finalBalanceToSet.toFixed(2) })
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

    revalidatePath("/accounts");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error adjusting account balance:", error);
    return { success: false, error: "Falha ao ajustar o saldo." };
  }
}

type TransactionRow = {
  type: string;
  amount: string;
};

function calcDelta(rows: TransactionRow[]): number {
  return rows.reduce((acc, row) => {
    const amount = Number(row.amount);
    if (row.type === "income") return acc + amount;
    if (row.type === "expense" || row.type === "credit_card_expense") return acc - amount;
    return acc;
  }, 0);
}

export async function getHistoricalBalance(accountId: number, targetDate: Date): Promise<number | null> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [account] = await db
    .select({ currentBalance: accounts.currentBalance })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  if (!account) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const targetStr = format(target, "yyyy-MM-dd");

  if (target <= today) {
    const paidRows = await db
      .select({ type: transactions.type, amount: transactions.amount })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(transactions.status, "paid"),
          lte(transactions.date, targetStr),
          eq(transactions.userId, userId),
        ),
      );

    return calcDelta(paidRows);
  }

  const currentBalance = Number(account.currentBalance);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

  const pendingReal = await db
    .select({ type: transactions.type, amount: transactions.amount })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.status, "pending"),
        gte(transactions.date, tomorrowStr),
        lte(transactions.date, targetStr),
        eq(transactions.userId, userId),
      ),
    );

  const activeFixed = await db
    .select({
      id: fixedTransactions.id,
      type: fixedTransactions.type,
      amount: fixedTransactions.amount,
      startDate: fixedTransactions.startDate,
      accountId: fixedTransactions.accountId,
    })
    .from(fixedTransactions)
    .where(
      and(
        eq(fixedTransactions.active, true),
        eq(fixedTransactions.accountId, accountId),
        lte(fixedTransactions.startDate, targetStr),
        eq(fixedTransactions.userId, userId),
      ),
    );

  const materializedFixedIds = new Set<string>();
  if (activeFixed.length > 0) {
    const materializedRows = await db
      .select({ fixedTransactionId: transactions.fixedTransactionId })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          gte(transactions.date, tomorrowStr),
          lte(transactions.date, targetStr),
          eq(transactions.userId, userId),
        ),
      );

    for (const row of materializedRows) {
      if (row.fixedTransactionId) {
        materializedFixedIds.add(row.fixedTransactionId);
      }
    }
  }

  const virtualRows: TransactionRow[] = [];

  for (const ft of activeFixed) {
    if (materializedFixedIds.has(ft.id)) continue;

    const ftStartDate = new Date(ft.startDate);
    const cursor = new Date(tomorrow);
    cursor.setDate(ftStartDate.getDate());
    if (cursor < tomorrow) {
      cursor.setMonth(cursor.getMonth() + 1);
    }

    while (cursor <= target) {
      virtualRows.push({ type: ft.type, amount: ft.amount });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const futureDelta = calcDelta([...pendingReal, ...virtualRows]);
  return currentBalance + futureDelta;
}

export async function getAccountsBalancesByCompetency(competencyMonth: string) {
  let dateObj = parse(competencyMonth, "yyyy-MM", new Date());
  if (!isValid(dateObj)) {
    dateObj = parse(competencyMonth, "MM/yyyy", new Date());
  }
  if (!isValid(dateObj)) {
    throw new Error("Mês de competência inválido. Utilize YYYY-MM ou MM/YYYY.");
  }

  const targetDate = endOfMonth(dateObj);

  const allAccounts = await getAccounts();

  const results = await Promise.all(
    allAccounts.map(async (acc) => {
      const balance = await getHistoricalBalance(acc.id, targetDate);
      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        currentBalance: (balance ?? 0).toString(),
      };
    }),
  );

  return results;
}
