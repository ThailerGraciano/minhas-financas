"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { transactions, categories, creditCards } from "@/db/schema";
import { and, eq, gte, lte, ne, SQL } from "drizzle-orm";

export interface GridFilters {
  dateStart?: string;
  dateEnd?: string;
  amountMin?: number;
  amountMax?: number;
  categoryId?: number;
  status?: "paid" | "pending";
  creditCardId?: number;
  invoiceMonth?: string;
}

export async function getTransactionsForGrid(filters: GridFilters) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const conditions: SQL[] = [
    eq(transactions.userId, userId),
    ne(transactions.status, "ignored"),
  ];

  if (filters.dateStart) {
    conditions.push(gte(transactions.date, filters.dateStart));
  }
  if (filters.dateEnd) {
    conditions.push(lte(transactions.date, filters.dateEnd));
  }
  if (filters.amountMin !== undefined) {
    conditions.push(gte(transactions.amount, filters.amountMin.toFixed(2)));
  }
  if (filters.amountMax !== undefined) {
    conditions.push(lte(transactions.amount, filters.amountMax.toFixed(2)));
  }
  if (filters.categoryId) {
    conditions.push(eq(transactions.categoryId, filters.categoryId));
  }
  if (filters.status) {
    conditions.push(eq(transactions.status, filters.status));
  }
  if (filters.creditCardId) {
    conditions.push(eq(transactions.creditCardId, filters.creditCardId));
  }
  if (filters.invoiceMonth) {
    conditions.push(eq(transactions.invoiceMonth, filters.invoiceMonth));
  }

  const rows = await db.query.transactions.findMany({
    where: and(...conditions),
    with: {
      account: { columns: { id: true, name: true } },
      category: { columns: { id: true, name: true, icon: true } },
      subcategory: { columns: { id: true, name: true } },
      creditCard: { columns: { id: true, name: true } },
    },
    orderBy: (t, { desc }) => [desc(t.date), desc(t.id)],
  });

  return rows;
}

export type GridTransaction = Awaited<ReturnType<typeof getTransactionsForGrid>>[number];

export async function getGridFilterOptions() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [cats, cards] = await Promise.all([
    db.query.categories.findMany({
      where: eq(categories.userId, userId),
      columns: { id: true, name: true, type: true, icon: true },
      with: {
        subcategories: {
          columns: { id: true, name: true },
          orderBy: (s, { asc }) => [asc(s.name)],
        },
      },
      orderBy: (c, { asc }) => [asc(c.name)],
    }),
    db.select({ id: creditCards.id, name: creditCards.name })
      .from(creditCards)
      .where(eq(creditCards.userId, userId)),
  ]);

  return { categories: cats, creditCards: cards };
}
