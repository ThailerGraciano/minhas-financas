"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { accounts, budgets, categories, creditCards, settings, subcategories, transactions } from "@/db/schema";
import {
  CONSUMPTION_NATURES,
  DEFAULT_CONSUMPTION_NATURES,
  cleanBaseDescription,
  computeConsumptionIntelligence,
  extractInstallmentInfo,
  formatDateOnly,
  getCompetencyCycle,
  isClassificationSource,
  isConsumptionNature,
  isDefaultConsumptionNature,
  normalizeText,
  type ConsumptionIntelligenceResult,
  type ConsumptionNature,
  type DefaultConsumptionNature,
  type ManualClassificationHistoryEntry,
  type RawConsumptionTransaction,
} from "@/lib/consumption-intelligence";
import { getDefaultCompetencyMonth, getTodayInBrazil } from "@/lib/date-utils";
import { format, parseISO, subMonths } from "date-fns";
import { and, eq, gte, inArray, isNull, lte, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getConsumptionIntelligenceData(month?: string): Promise<ConsumptionIntelligenceResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [appSettingsRows, userCategories, userSubcategories, userBudgets, userAccounts, userCards] = await Promise.all([
    db.select().from(settings).where(eq(settings.userId, userId)).limit(1),
    db.select().from(categories).where(eq(categories.userId, userId)),
    db.select().from(subcategories).where(eq(subcategories.userId, userId)),
    db.select().from(budgets).where(eq(budgets.userId, userId)),
    db.select().from(accounts).where(eq(accounts.userId, userId)),
    db.select().from(creditCards).where(eq(creditCards.userId, userId)),
  ]);

  const closingDay = appSettingsRows[0]?.closingDay || 25;
  const targetMonth = month || getDefaultCompetencyMonth(closingDay);
  const targetDate = parseISO(`${targetMonth}-01`);

  const earliestBaselineMonth = format(subMonths(targetDate, 3), "yyyy-MM");
  const earliestCycle = getCompetencyCycle(earliestBaselineMonth, closingDay);
  const targetCycle = getCompetencyCycle(targetMonth, closingDay);

  const [windowTransactions, manualRows] = await Promise.all([
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        launchDate: transactions.launchDate,
        dueDate: transactions.dueDate,
        status: transactions.status,
        isFixed: transactions.isFixed,
        fixedTransactionId: transactions.fixedTransactionId,
        loanId: transactions.loanId,
        installmentCurrent: transactions.installmentCurrent,
        installmentTotal: transactions.installmentTotal,
        installmentParentId: transactions.installmentParentId,
        parentTransactionId: transactions.parentTransactionId,
        creditCardId: transactions.creditCardId,
        accountId: transactions.accountId,
        categoryId: transactions.categoryId,
        subcategoryId: transactions.subcategoryId,
        consumptionNature: transactions.consumptionNature,
        consumptionNatureSource: transactions.consumptionNatureSource,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          ne(transactions.status, "ignored"),
          ne(transactions.type, "income"),
          gte(transactions.launchDate, earliestCycle.startDate),
          lte(transactions.launchDate, targetCycle.endDate),
        ),
      ),
    db
      .select({
        id: transactions.id,
        description: transactions.description,
        categoryId: transactions.categoryId,
        subcategoryId: transactions.subcategoryId,
        consumptionNature: transactions.consumptionNature,
        installmentParentId: transactions.installmentParentId,
        parentTransactionId: transactions.parentTransactionId,
        installmentTotal: transactions.installmentTotal,
        type: transactions.type,
        creditCardId: transactions.creditCardId,
        accountId: transactions.accountId,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.consumptionNatureSource, "manual"))),
  ]);

  const categoryMap = new Map(userCategories.map((c) => [c.id, c]));
  const subcategoryMap = new Map(userSubcategories.map((s) => [s.id, s]));
  const accountMap = new Map(userAccounts.map((a) => [a.id, a]));
  const cardMap = new Map(userCards.map((c) => [c.id, c]));

  // Orçamento por categoria (soma das subcategorias orçadas ou teto da categoria pai)
  const subBudgetsSumByCat = new Map<number, number>();
  const parentBudgetByCat = new Map<number, number>();
  for (const b of userBudgets) {
    const amt = Number(b.amount);
    if (b.subcategoryId !== null) {
      subBudgetsSumByCat.set(b.categoryId, (subBudgetsSumByCat.get(b.categoryId) ?? 0) + amt);
    } else {
      parentBudgetByCat.set(b.categoryId, amt);
    }
  }
  const categoryBudgets = new Map<number, number>();
  for (const cat of userCategories) {
    const subSum = roundCurrency(subBudgetsSumByCat.get(cat.id) ?? 0);
    if (subSum > 0) {
      categoryBudgets.set(cat.id, subSum);
    } else {
      const parentVal = roundCurrency(parentBudgetByCat.get(cat.id) ?? 0);
      if (parentVal > 0) {
        categoryBudgets.set(cat.id, parentVal);
      }
    }
  }

  const rawTransactions: RawConsumptionTransaction[] = windowTransactions.map((t) => {
    const cat = categoryMap.get(t.categoryId);
    const sub = t.subcategoryId ? subcategoryMap.get(t.subcategoryId) : undefined;
    const acc = t.accountId ? accountMap.get(t.accountId) : undefined;
    const card = t.creditCardId ? cardMap.get(t.creditCardId) : undefined;

    return {
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      launchDate: t.launchDate,
      dueDate: t.dueDate,
      status: t.status,
      isFixed: t.isFixed,
      fixedTransactionId: t.fixedTransactionId,
      loanId: t.loanId,
      installmentCurrent: t.installmentCurrent,
      installmentTotal: t.installmentTotal,
      installmentParentId: t.installmentParentId,
      parentTransactionId: t.parentTransactionId,
      creditCardId: t.creditCardId,
      accountId: t.accountId,
      accountType: acc?.type ?? null,
      accountName: acc?.name ?? null,
      creditCardName: card?.name ?? null,
      categoryId: t.categoryId,
      categoryName: cat?.name ?? "Sem categoria",
      categoryIcon: cat?.icon ?? "Tag",
      categoryDefaultNature: isDefaultConsumptionNature(cat?.defaultConsumptionNature)
        ? cat.defaultConsumptionNature
        : null,
      subcategoryId: t.subcategoryId,
      subcategoryName: sub?.name ?? null,
      subcategoryDefaultNature: isDefaultConsumptionNature(sub?.defaultConsumptionNature)
        ? sub.defaultConsumptionNature
        : null,
      persistedNature: isConsumptionNature(t.consumptionNature) ? t.consumptionNature : null,
      persistedSource: isClassificationSource(t.consumptionNatureSource) ? t.consumptionNatureSource : null,
    };
  });

  const manualHistory: ManualClassificationHistoryEntry[] = [];
  for (const row of manualRows) {
    if (!isConsumptionNature(row.consumptionNature)) continue;
    manualHistory.push({
      id: row.id,
      description: row.description,
      categoryId: row.categoryId,
      subcategoryId: row.subcategoryId,
      nature: row.consumptionNature,
      installmentParentId: row.installmentParentId,
      parentTransactionId: row.parentTransactionId,
      installmentTotal: row.installmentTotal,
      type: row.type,
      creditCardId: row.creditCardId,
      accountId: row.accountId,
    });
  }

  const categoryCatalog = userCategories
    .filter((c) => c.type === "expense")
    .map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      defaultNature: isDefaultConsumptionNature(c.defaultConsumptionNature) ? c.defaultConsumptionNature : null,
    }));

  const referenceToday = formatDateOnly(getTodayInBrazil());

  return computeConsumptionIntelligence({
    targetMonth,
    closingDay,
    referenceToday,
    transactions: rawTransactions,
    manualHistory,
    categoryBudgets,
    categoryCatalog,
  });
}

const updateTransactionNatureSchema = z.object({
  transactionId: z.number().int().positive(),
  nature: z.enum(CONSUMPTION_NATURES),
  applyToCategoryDefault: z.boolean().optional().default(false),
  applyToRuleScope: z.enum(["none", "subcategory", "category"]).optional(),
});

export async function updateTransactionConsumptionNature(input: {
  transactionId: number;
  nature: ConsumptionNature;
  applyToCategoryDefault?: boolean;
  applyToRuleScope?: "none" | "subcategory" | "category";
}): Promise<{
  success: boolean;
  updatedCount?: number;
  appliedRuleScope?: "subcategory" | "category" | null;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const parsed = updateTransactionNatureSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { transactionId, nature, applyToCategoryDefault, applyToRuleScope } = parsed.data;
  const resolvedScope: "none" | "subcategory" | "category" =
    applyToRuleScope ?? (applyToCategoryDefault ? "category" : "none");

  try {
    const { updatedCount, appliedScope } = await db.transaction(async (tx) => {
      const [targetTx] = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
        .limit(1);

      if (!targetTx) {
        throw new Error("Transação não encontrada.");
      }

      const now = new Date();

      await tx
        .update(transactions)
        .set({
          consumptionNature: nature,
          consumptionNatureSource: "manual",
          consumptionClassifiedAt: now,
        })
        .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

      let totalUpdated = 1;

      const instInfo = extractInstallmentInfo({
        description: targetTx.description,
        installmentCurrent: targetTx.installmentCurrent,
        installmentTotal: targetTx.installmentTotal,
      });
      const isInstallment = Boolean((instInfo.total && instInfo.total > 1) || targetTx.installmentParentId);

      if (isInstallment) {
        const rootId =
          targetTx.installmentParentId ??
          (targetTx.type !== "transfer" && targetTx.parentTransactionId ? targetTx.parentTransactionId : targetTx.id);

        const linkedConditions = [
          eq(transactions.id, rootId),
          eq(transactions.installmentParentId, rootId),
        ];
        if (targetTx.type !== "transfer") {
          linkedConditions.push(eq(transactions.parentTransactionId, rootId));
        }

        const linkedSiblings = await tx
          .select({ id: transactions.id })
          .from(transactions)
          .where(and(eq(transactions.userId, userId), or(...linkedConditions)));

        const siblingIds = new Set(linkedSiblings.map((s) => s.id));

        // Fallback para compras parceladas importadas/antigas sem installment_parent_id preenchido
        if (siblingIds.size <= 1 && instInfo.total && instInfo.total > 1) {
          const baseNorm = normalizeText(cleanBaseDescription(targetTx.description));
          const candidates = await tx
            .select({
              id: transactions.id,
              description: transactions.description,
              installmentCurrent: transactions.installmentCurrent,
              installmentTotal: transactions.installmentTotal,
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, userId),
                eq(transactions.type, targetTx.type),
                targetTx.creditCardId
                  ? eq(transactions.creditCardId, targetTx.creditCardId)
                  : isNull(transactions.creditCardId),
                targetTx.accountId
                  ? eq(transactions.accountId, targetTx.accountId)
                  : isNull(transactions.accountId),
              ),
            );

          for (const cand of candidates) {
            const candInfo = extractInstallmentInfo({
              description: cand.description,
              installmentCurrent: cand.installmentCurrent,
              installmentTotal: cand.installmentTotal,
            });
            if (candInfo.total !== instInfo.total) continue;
            if (normalizeText(cleanBaseDescription(cand.description)) === baseNorm) {
              siblingIds.add(cand.id);
            }
          }
        }

        siblingIds.delete(transactionId);
        const idsToInherit = Array.from(siblingIds);

        if (idsToInherit.length > 0) {
          await tx
            .update(transactions)
            .set({
              consumptionNature: nature,
              consumptionNatureSource: "inherited_installment",
              consumptionClassifiedAt: now,
            })
            .where(and(eq(transactions.userId, userId), inArray(transactions.id, idsToInherit)));
          totalUpdated += idsToInherit.length;
        }
      }

      let scopeApplied: "subcategory" | "category" | null = null;
      if (resolvedScope !== "none" && isDefaultConsumptionNature(nature)) {
        if (resolvedScope === "subcategory" && targetTx.subcategoryId) {
          await tx
            .update(subcategories)
            .set({ defaultConsumptionNature: nature })
            .where(
              and(
                eq(subcategories.id, targetTx.subcategoryId),
                eq(subcategories.categoryId, targetTx.categoryId),
                eq(subcategories.userId, userId),
              ),
            );
          scopeApplied = "subcategory";
        } else {
          await tx
            .update(categories)
            .set({ defaultConsumptionNature: nature })
            .where(and(eq(categories.id, targetTx.categoryId), eq(categories.userId, userId)));
          scopeApplied = "category";
        }
      }

      return { updatedCount: totalUpdated, appliedScope: scopeApplied };
    });

    revalidatePath("/");
    revalidatePath("/categories");
    revalidatePath("/transactions");
    revalidatePath("/credit-cards");

    return { success: true, updatedCount, appliedRuleScope: appliedScope };
  } catch (error) {
    console.error("Error updating transaction consumption nature:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao atualizar natureza do lançamento.",
    };
  }
}

const updateCategoryDefaultNatureSchema = z.object({
  categoryId: z.number().int().positive(),
  subcategoryId: z.number().int().positive().nullable().optional(),
  nature: z.enum(DEFAULT_CONSUMPTION_NATURES).nullable(),
});

export async function updateCategoryDefaultConsumptionNature(input: {
  categoryId: number;
  subcategoryId?: number | null;
  nature: DefaultConsumptionNature | null;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const parsed = updateCategoryDefaultNatureSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { categoryId, subcategoryId, nature } = parsed.data;

  try {
    if (subcategoryId) {
      await db
        .update(subcategories)
        .set({ defaultConsumptionNature: nature })
        .where(and(eq(subcategories.id, subcategoryId), eq(subcategories.categoryId, categoryId), eq(subcategories.userId, userId)));
    } else {
      await db
        .update(categories)
        .set({ defaultConsumptionNature: nature })
        .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
    }

    revalidatePath("/");
    revalidatePath("/categories");
    return { success: true };
  } catch (error) {
    console.error("Error updating category default consumption nature:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao atualizar natureza padrão da categoria.",
    };
  }
}
