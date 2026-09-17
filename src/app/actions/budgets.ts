"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { budgets, categories, creditCards, settings, transactions } from "@/db/schema";
import { buildGlobalCompetencyCondition } from "@/lib/competency-utils";
import { format, parseISO, subMonths } from "date-fns";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type BudgetPillar = "needs" | "lifestyle" | "goals";

export type SubcategoryBudgetHierarchy = {
  id: number;
  name: string;
  budgetId?: number;
  limit: number;
  consumed: number;
  effective: number;
  pending: number;
  percent: number;
};

export type CategoryBudgetHierarchy = {
  id: number;
  name: string;
  icon: string;
  budgetId?: number;
  pillar: BudgetPillar;
  limit: number;
  consumed: number;
  effective: number;
  pending: number;
  percent: number;
  subcategories: SubcategoryBudgetHierarchy[];
};

export type PillarDistribution = {
  needsAmount: number;
  needsPercent: number;
  lifestyleAmount: number;
  lifestylePercent: number;
  goalsAmount: number;
  goalsPercent: number;
  freeAmount: number;
  freePercent: number;
};

export type BudgetData = {
  month: string;
  closingDay: number;
  projectedIncome: number;
  historicalAverageIncome: number;
  incomeVariationPercent: number;
  committedBudget: number;
  committedPercent: number;
  freeBalance: number;
  pillars: PillarDistribution;
  categories: CategoryBudgetHierarchy[];
  allExpenseCategories: Array<{
    id: number;
    name: string;
    subcategories: Array<{ id: number; name: string }>;
  }>;
};

export async function getBudgetData(month: string): Promise<BudgetData> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;

  const allCards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));
  const condition = buildGlobalCompetencyCondition(month, closingDay, userId, allCards);

  // 1. Receitas do mês atual
  const monthIncomeTransactions = await db
    .select()
    .from(transactions)
    .where(and(condition, eq(transactions.type, "income"), ne(transactions.status, "ignored")));

  const currentIncome = monthIncomeTransactions.reduce((acc, t) => acc + Number(t.amount), 0);

  // 2. Receitas do mês anterior (para calcular a variação percentual)
  const prevMonthDate = subMonths(parseISO(`${month}-01`), 1);
  const prevMonthStr = format(prevMonthDate, "yyyy-MM");
  const prevCondition = buildGlobalCompetencyCondition(prevMonthStr, closingDay, userId, allCards);

  const prevIncomeTransactions = await db
    .select()
    .from(transactions)
    .where(and(prevCondition, eq(transactions.type, "income"), ne(transactions.status, "ignored")));

  const prevIncome = prevIncomeTransactions.reduce((acc, t) => acc + Number(t.amount), 0);

  // 3. Média histórica (últimos 3 meses anteriores)
  let totalPastIncome = 0;
  let pastMonthsCount = 0;
  for (let i = 1; i <= 3; i++) {
    const pastDate = subMonths(parseISO(`${month}-01`), i);
    const pastMonthStr = format(pastDate, "yyyy-MM");
    const pastCondition = buildGlobalCompetencyCondition(pastMonthStr, closingDay, userId, allCards);
    const pastTxs = await db
      .select()
      .from(transactions)
      .where(and(pastCondition, eq(transactions.type, "income"), ne(transactions.status, "ignored")));
    const sum = pastTxs.reduce((acc, t) => acc + Number(t.amount), 0);
    if (sum > 0) {
      totalPastIncome += sum;
      pastMonthsCount++;
    }
  }

  const historicalAverageIncome = pastMonthsCount > 0 ? totalPastIncome / pastMonthsCount : currentIncome || 3000;
  const projectedIncome = currentIncome > 0 ? currentIncome : historicalAverageIncome;
  const incomeVariationPercent = prevIncome > 0 ? ((projectedIncome - prevIncome) / prevIncome) * 100 : 3.2;

  // 4. Categorias e Subcategorias do usuário
  const userCategories = await db.query.categories.findMany({
    where: and(eq(categories.userId, userId), eq(categories.type, "expense")),
    with: {
      subcategories: true,
    },
  });

  // 5. Orçamentos cadastrados para o mês
  const userBudgets = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month)));

  // 6. Despesas realizadas no mês de competência
  const monthExpenseTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        condition,
        inArray(transactions.type, ["expense", "credit_card_expense"]),
        ne(transactions.status, "ignored"),
      ),
    );

  // 7. Montagem hierárquica e cálculo de consumo
  const hierarchyList: CategoryBudgetHierarchy[] = [];
  let committedBudget = 0;
  let needsTotal = 0;
  let lifestyleTotal = 0;
  let goalsTotal = 0;

  for (const cat of userCategories) {
    const catTxs = monthExpenseTransactions.filter((t) => t.categoryId === cat.id);

    // Orçamento do teto pai (subcategoryId is null)
    const parentBudget = userBudgets.find((b) => b.categoryId === cat.id && b.subcategoryId === null);

    // Subcategorias com consumo e orçamento individual
    const subList: SubcategoryBudgetHierarchy[] = cat.subcategories.map((sub) => {
      const subTxs = catTxs.filter((t) => t.subcategoryId === sub.id);
      const effective = subTxs.filter((t) => t.status === "paid").reduce((acc, t) => acc + Number(t.amount), 0);
      const pending = subTxs.filter((t) => t.status === "pending").reduce((acc, t) => acc + Number(t.amount), 0);
      const consumed = effective + pending;

      const subBudget = userBudgets.find((b) => b.categoryId === cat.id && b.subcategoryId === sub.id);
      const limit = subBudget ? Number(subBudget.amount) : 0;
      const percent = limit > 0 ? (consumed / limit) * 100 : 0;

      return {
        id: sub.id,
        name: sub.name,
        budgetId: subBudget?.id,
        limit,
        consumed,
        effective,
        pending,
        percent,
      };
    });

    // Total de consumo da categoria pai
    const catEffective = catTxs.filter((t) => t.status === "paid").reduce((acc, t) => acc + Number(t.amount), 0);
    const catPending = catTxs.filter((t) => t.status === "pending").reduce((acc, t) => acc + Number(t.amount), 0);
    const catConsumed = catEffective + catPending;

    // Limite da categoria: ou teto global pai definido, ou soma das subcategorias
    const subLimitsSum = subList.reduce((acc, s) => acc + s.limit, 0);
    const catLimit = parentBudget ? Number(parentBudget.amount) : subLimitsSum;

    // Pilar padrão: se pai definido usa o pai, senão busca de subcategoria ou padrão 'needs'
    const pillar: BudgetPillar = (parentBudget?.pillar as BudgetPillar) || "needs";

    const catPercent = catLimit > 0 ? (catConsumed / catLimit) * 100 : 0;

    // Se a categoria tem orçamento (no pai ou em subcategorias) ou teve gastos, adiciona à listagem
    if (catLimit > 0 || catConsumed > 0 || parentBudget) {
      hierarchyList.push({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || "Tag",
        budgetId: parentBudget?.id,
        pillar,
        limit: catLimit,
        consumed: catConsumed,
        effective: catEffective,
        pending: catPending,
        percent: catPercent,
        subcategories: subList,
      });

      committedBudget += catLimit;
      if (pillar === "needs") needsTotal += catLimit;
      else if (pillar === "lifestyle") lifestyleTotal += catLimit;
      else if (pillar === "goals") goalsTotal += catLimit;
    }
  }

  // 8. Totais e Distribuição por Pilar
  const freeBalance = projectedIncome - committedBudget;
  const committedPercent = projectedIncome > 0 ? (committedBudget / projectedIncome) * 100 : 0;

  const baseForDistribution = Math.max(projectedIncome, committedBudget, 1);
  const freeForPillars = Math.max(0, freeBalance);

  const pillars: PillarDistribution = {
    needsAmount: needsTotal,
    needsPercent: (needsTotal / baseForDistribution) * 100,
    lifestyleAmount: lifestyleTotal,
    lifestylePercent: (lifestyleTotal / baseForDistribution) * 100,
    goalsAmount: goalsTotal,
    goalsPercent: (goalsTotal / baseForDistribution) * 100,
    freeAmount: freeForPillars,
    freePercent: (freeForPillars / baseForDistribution) * 100,
  };

  const allExpenseCategories = userCategories.map((c) => ({
    id: c.id,
    name: c.name,
    subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })),
  }));

  return {
    month,
    closingDay,
    projectedIncome,
    historicalAverageIncome,
    incomeVariationPercent,
    committedBudget,
    committedPercent,
    freeBalance,
    pillars,
    categories: hierarchyList,
    allExpenseCategories,
  };
}

export type SaveBudgetInput = {
  id?: number;
  categoryId: number;
  subcategoryId?: number | null;
  amount: number;
  pillar: BudgetPillar;
  month: string;
};

export async function saveBudgetLimit(data: SaveBudgetInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Não autorizado." };
  const userId = session.user.id;

  if (!data.categoryId) {
    return { success: false, error: "Categoria é obrigatória." };
  }

  if (data.amount <= 0) {
    return { success: false, error: "O valor do orçamento deve ser maior que zero." };
  }

  try {
    const subcatId = data.subcategoryId ? Number(data.subcategoryId) : null;

    if (data.id) {
      await db
        .update(budgets)
        .set({
          amount: data.amount.toString(),
          pillar: data.pillar,
          updatedAt: new Date(),
        })
        .where(and(eq(budgets.id, data.id), eq(budgets.userId, userId)));
    } else {
      // Verifica se já existe orçamento para a mesma categoria / subcategoria / mês
      const existing = await db
        .select()
        .from(budgets)
        .where(
          and(
            eq(budgets.userId, userId),
            eq(budgets.month, data.month),
            eq(budgets.categoryId, data.categoryId),
            subcatId ? eq(budgets.subcategoryId, subcatId) : isNull(budgets.subcategoryId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(budgets)
          .set({
            amount: data.amount.toString(),
            pillar: data.pillar,
            updatedAt: new Date(),
          })
          .where(eq(budgets.id, existing[0].id));
      } else {
        await db.insert(budgets).values({
          userId,
          categoryId: data.categoryId,
          subcategoryId: subcatId,
          amount: data.amount.toString(),
          pillar: data.pillar,
          month: data.month,
        });
      }
    }

    revalidatePath("/budgets");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar limite orçamentário:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao salvar orçamento.",
    };
  }
}

export async function deleteBudgetLimit(id: number) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Não autorizado." };
  const userId = session.user.id;

  try {
    await db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
    revalidatePath("/budgets");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar orçamento:", error);
    return { success: false, error: "Erro ao deletar orçamento." };
  }
}
