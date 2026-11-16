"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { categories, creditCards, transactions } from "@/db/schema";
import { buildCategoryUsageOrderBy } from "@/lib/category-utils";
import { and, eq, gte, lte, ne, SQL } from "drizzle-orm";

export type GridDateType = "dueDate" | "launchDate" | "paidAt";

export interface GridFilters {
  dateType?: GridDateType;
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

  const dateType: GridDateType = filters.dateType ?? "dueDate";
  const conditions: SQL[] = [eq(transactions.userId, userId), ne(transactions.status, "ignored")];

  if (filters.dateStart) {
    if (dateType === "launchDate") {
      conditions.push(gte(transactions.launchDate, filters.dateStart));
    } else if (dateType === "paidAt") {
      conditions.push(gte(transactions.paidAt, new Date(`${filters.dateStart}T00:00:00`)));
    } else {
      conditions.push(gte(transactions.dueDate, filters.dateStart));
    }
  }
  if (filters.dateEnd) {
    if (dateType === "launchDate") {
      conditions.push(lte(transactions.launchDate, filters.dateEnd));
    } else if (dateType === "paidAt") {
      conditions.push(lte(transactions.paidAt, new Date(`${filters.dateEnd}T23:59:59.999`)));
    } else {
      conditions.push(lte(transactions.dueDate, filters.dateEnd));
    }
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
    orderBy: (t, { desc }) => {
      if (dateType === "launchDate") return [desc(t.launchDate), desc(t.id)];
      if (dateType === "paidAt") return [desc(t.paidAt), desc(t.id)];
      return [desc(t.dueDate), desc(t.id)];
    },
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
      orderBy: buildCategoryUsageOrderBy({ userId }),
    }),
    db.select({ id: creditCards.id, name: creditCards.name }).from(creditCards).where(eq(creditCards.userId, userId)),
  ]);

  return { categories: cats, creditCards: cards };
}
