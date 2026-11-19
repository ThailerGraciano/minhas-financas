import { db } from "@/db";
import {
  accounts,
  categories,
  creditCards,
  fixedTransactionOverrides,
  fixedTransactions,
  subcategories,
} from "@/db/schema";
import { format, parseISO, subMonths } from "date-fns";
import { and, eq, gte, inArray, isNull, or } from "drizzle-orm";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type FixedOverrideRow = typeof fixedTransactionOverrides.$inferSelect;

export type FixedOverrideWithRelations = FixedOverrideRow & {
  account: typeof accounts.$inferSelect | null;
  category: typeof categories.$inferSelect | null;
  subcategory: typeof subcategories.$inferSelect | null;
  creditCard: typeof creditCards.$inferSelect | null;
  destinationAccount: typeof accounts.$inferSelect | null;
};

export type FixedTransactionBase = {
  id: string;
  type: string;
  amount: string;
  description: string;
  startDate: string;
  endMonth?: string | null;
  active: boolean;
  accountId: number | null;
  creditCardId: number | null;
  categoryId: number;
  subcategoryId: number | null;
  destinationAccountId: number | null;
};

export function fixedOverrideKey(fixedTransactionId: string, competencyMonth: string): string {
  return `${fixedTransactionId}:${competencyMonth}`;
}

export function getPreviousCompetencyMonth(competencyMonth: string): string {
  const parsed = parseISO(`${competencyMonth}-01`);
  return format(subMonths(parsed, 1), "yyyy-MM");
}

export function activeFixedCondition(userId: string, targetCompetencyMonth?: string) {
  const base = and(eq(fixedTransactions.userId, userId), eq(fixedTransactions.active, true));
  if (!targetCompetencyMonth) return base;
  return and(
    base,
    or(isNull(fixedTransactions.endMonth), gte(fixedTransactions.endMonth, targetCompetencyMonth)),
  );
}

export function isFixedActiveForMonth(
  ft: { active: boolean; endMonth?: string | null },
  competencyMonth: string,
): boolean {
  if (!ft.active) return false;
  if (ft.endMonth && competencyMonth > ft.endMonth) return false;
  return true;
}

export async function getFixedOverridesMap(
  userId: string,
  fixedIds: string[],
  competencyMonths?: string[],
): Promise<Map<string, FixedOverrideWithRelations>> {
  const map = new Map<string, FixedOverrideWithRelations>();
  if (fixedIds.length === 0) return map;

  const conditions = [
    eq(fixedTransactionOverrides.userId, userId),
    inArray(fixedTransactionOverrides.fixedTransactionId, fixedIds),
  ];
  if (competencyMonths && competencyMonths.length > 0) {
    conditions.push(inArray(fixedTransactionOverrides.competencyMonth, competencyMonths));
  }

  const rows = await db.query.fixedTransactionOverrides.findMany({
    where: and(...conditions),
    with: {
      account: true,
      category: true,
      subcategory: true,
      creditCard: true,
      destinationAccount: true,
    },
  });

  for (const row of rows) {
    map.set(fixedOverrideKey(row.fixedTransactionId, row.competencyMonth), row as FixedOverrideWithRelations);
  }
  return map;
}

export async function getFixedOverridesMapSimple(
  userId: string,
  fixedIds: string[],
  competencyMonths?: string[],
): Promise<Map<string, FixedOverrideRow>> {
  const map = new Map<string, FixedOverrideRow>();
  if (fixedIds.length === 0) return map;

  const conditions = [
    eq(fixedTransactionOverrides.userId, userId),
    inArray(fixedTransactionOverrides.fixedTransactionId, fixedIds),
  ];
  if (competencyMonths && competencyMonths.length > 0) {
    conditions.push(inArray(fixedTransactionOverrides.competencyMonth, competencyMonths));
  }

  const rows = await db
    .select()
    .from(fixedTransactionOverrides)
    .where(and(...conditions));

  for (const row of rows) {
    map.set(fixedOverrideKey(row.fixedTransactionId, row.competencyMonth), row);
  }
  return map;
}

export function getFixedOverride<T extends FixedOverrideRow>(
  map: Map<string, T>,
  fixedTransactionId: string,
  competencyMonth: string,
): T | undefined {
  return map.get(fixedOverrideKey(fixedTransactionId, competencyMonth));
}

export function resolveFixedOccurrence<
  T extends FixedTransactionBase,
  O extends FixedOverrideRow = FixedOverrideRow,
>(ft: T, override?: O) {
  if (override?.isIgnored) {
    return null;
  }

  return {
    ...ft,
    amount: override?.amount ?? ft.amount,
    description: override?.description ?? ft.description,
    overrideDueDate: override?.dueDate ?? null,
    overrideLaunchDate: override?.launchDate ?? null,
    categoryId: override?.categoryId ?? ft.categoryId,
    subcategoryId: override && override.subcategoryId !== undefined ? override.subcategoryId : ft.subcategoryId,
    accountId: override?.accountId ?? ft.accountId,
    creditCardId: override?.creditCardId ?? ft.creditCardId,
    destinationAccountId: override?.destinationAccountId ?? ft.destinationAccountId,
  };
}

export type UpsertFixedOverrideInput = {
  userId: string;
  fixedTransactionId: string;
  competencyMonth: string;
  amount?: string | null;
  description?: string | null;
  dueDate?: string | null;
  launchDate?: string | null;
  categoryId?: number | null;
  subcategoryId?: number | null;
  accountId?: number | null;
  creditCardId?: number | null;
  destinationAccountId?: number | null;
  isIgnored?: boolean;
};

export async function upsertFixedOverride(txOrDb: DbOrTx, input: UpsertFixedOverrideInput) {
  const { userId, fixedTransactionId, competencyMonth, ...fields } = input;
  const now = new Date();

  const updateSet: Partial<typeof fixedTransactionOverrides.$inferInsert> = {
    updatedAt: now,
  };
  if (fields.amount !== undefined) updateSet.amount = fields.amount;
  if (fields.description !== undefined) updateSet.description = fields.description;
  if (fields.dueDate !== undefined) updateSet.dueDate = fields.dueDate;
  if (fields.launchDate !== undefined) updateSet.launchDate = fields.launchDate;
  if (fields.categoryId !== undefined) updateSet.categoryId = fields.categoryId;
  if (fields.subcategoryId !== undefined) updateSet.subcategoryId = fields.subcategoryId;
  if (fields.accountId !== undefined) updateSet.accountId = fields.accountId;
  if (fields.creditCardId !== undefined) updateSet.creditCardId = fields.creditCardId;
  if (fields.destinationAccountId !== undefined) updateSet.destinationAccountId = fields.destinationAccountId;
  if (fields.isIgnored !== undefined) updateSet.isIgnored = fields.isIgnored;

  await txOrDb
    .insert(fixedTransactionOverrides)
    .values({
      userId,
      fixedTransactionId,
      competencyMonth,
      amount: fields.amount ?? null,
      description: fields.description ?? null,
      dueDate: fields.dueDate ?? null,
      launchDate: fields.launchDate ?? null,
      categoryId: fields.categoryId ?? null,
      subcategoryId: fields.subcategoryId ?? null,
      accountId: fields.accountId ?? null,
      creditCardId: fields.creditCardId ?? null,
      destinationAccountId: fields.destinationAccountId ?? null,
      isIgnored: fields.isIgnored ?? false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [fixedTransactionOverrides.fixedTransactionId, fixedTransactionOverrides.competencyMonth],
      set: updateSet,
    });
}
