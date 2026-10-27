"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  accounts,
  budgetMonthConfigs,
  budgets,
  categories,
  creditCards,
  fixedTransactions,
  settings,
  subcategories,
  transactions,
} from "@/db/schema";
import {
  roundCurrency,
  type BudgetIncomeSource,
} from "@/lib/budget-planner-utils";
import { buildGlobalCompetencyCondition } from "@/lib/competency-utils";
import { endOfMonth, format, parseISO, subMonths } from "date-fns";
import { and, eq, inArray, isNull, lte, ne } from "drizzle-orm";
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
  incomeSourceId: string | null;
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
  incomeSourceId: string | null;
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
  availableIncomes: BudgetIncomeSource[];
  selectedIncomeIds: string[];
  hasCustomIncomeSelection: boolean;
  allExpenseCategories: Array<{
    id: number;
    name: string;
    icon: string;
    subcategories: Array<{ id: number; name: string }>;
  }>;
};

async function fetchMonthAvailableIncomes(
  userId: string,
  month: string,
  closingDay: number,
  allCards: Array<{ id: number; dueDay: number; closingDay: number }>,
): Promise<BudgetIncomeSource[]> {
  const condition = buildGlobalCompetencyCondition(month, closingDay, userId, allCards);
  const monthDate = parseISO(`${month}-01`);
  const lastDayStr = format(endOfMonth(monthDate), "yyyy-MM-dd");

  const [monthIncomeTxs, activeFixedIncomes, userAccounts, incomeCategories] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(and(condition, eq(transactions.type, "income"), ne(transactions.status, "ignored"))),
    db
      .select()
      .from(fixedTransactions)
      .where(
        and(
          eq(fixedTransactions.userId, userId),
          eq(fixedTransactions.type, "income"),
          eq(fixedTransactions.active, true),
          lte(fixedTransactions.startDate, lastDayStr),
        ),
      ),
    db.select().from(accounts).where(eq(accounts.userId, userId)),
    db.select().from(categories).where(eq(categories.userId, userId)),
  ]);

  const accountMap = new Map(userAccounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(incomeCategories.map((c) => [c.id, c.name]));

  const sources: BudgetIncomeSource[] = [];
  const handledFixedIds = new Set<string>();

  // 1. Receitas fixas ativas cadastradas em fixed_transactions
  for (const ft of activeFixedIncomes) {
    handledFixedIds.add(ft.id);
    const materializedTxs = monthIncomeTxs.filter((t) => t.fixedTransactionId === ft.id);
    const materializedAmount = materializedTxs.reduce((acc, t) => acc + Number(t.amount), 0);
    const primaryMat = materializedTxs[0];

    const amount = roundCurrency(
      materializedTxs.length > 0 ? materializedAmount : Number(ft.amount),
    );
    if (amount <= 0) continue;

    sources.push({
      id: ft.id,
      name: primaryMat?.description || ft.description,
      amount,
      categoryName: categoryMap.get(ft.categoryId) || "Receita Fixa",
      accountName: (ft.accountId ? accountMap.get(ft.accountId) : null) ?? null,
      isFixed: true,
      sourceType: "fixed_template",
    });
  }

  // 2. Transações de receita do mês que não vieram de uma fixed_transaction já listada
  for (const tx of monthIncomeTxs) {
    if (tx.fixedTransactionId && handledFixedIds.has(tx.fixedTransactionId)) {
      continue;
    }

    const amount = roundCurrency(Number(tx.amount));
    if (amount <= 0) continue;

    const sourceId = tx.fixedTransactionId ? tx.fixedTransactionId : `tx:${tx.id}`;
    if (tx.fixedTransactionId) {
      handledFixedIds.add(tx.fixedTransactionId);
    }

    sources.push({
      id: sourceId,
      name: tx.description,
      amount,
      categoryName: categoryMap.get(tx.categoryId) || "Receita",
      accountName: (tx.accountId ? accountMap.get(tx.accountId) : null) ?? null,
      isFixed: Boolean(tx.isFixed || tx.fixedTransactionId),
      sourceType: "transaction",
    });
  }

  sources.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  return sources;
}

export async function getBudgetData(month: string): Promise<BudgetData> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [appSettings] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  const closingDay = appSettings?.closingDay || 25;

  const allCards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));
  const condition = buildGlobalCompetencyCondition(month, closingDay, userId, allCards);

  // 1. Receitas disponíveis para o mês (fixas e lançadas no ciclo) + configuração salva do mês
  const [availableIncomes, monthConfigs] = await Promise.all([
    fetchMonthAvailableIncomes(userId, month, closingDay, allCards),
    db
      .select()
      .from(budgetMonthConfigs)
      .where(and(eq(budgetMonthConfigs.userId, userId), eq(budgetMonthConfigs.month, month)))
      .limit(1),
  ]);

  const monthConfig = monthConfigs[0];
  const availableIncomeIdSet = new Set(availableIncomes.map((inc) => inc.id));

  // 2. Orçamentos cadastrados para o mês
  const userBudgets = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month)));

  let selectedIncomeIds: string[];
  const hasCustomIncomeSelection = Boolean(monthConfig);

  if (monthConfig && Array.isArray(monthConfig.selectedIncomeIds)) {
    selectedIncomeIds = monthConfig.selectedIncomeIds.filter((id) => availableIncomeIdSet.has(id));
  } else {
    // Por padrão, seleciona todas as receitas disponíveis no período
    selectedIncomeIds = availableIncomes.map((inc) => inc.id);
  }

  // Garante que qualquer receita que já possua orçamento vinculado no banco esteja selecionada
  // caso não haja configuração explícita desmarcando-a
  if (!hasCustomIncomeSelection) {
    const selectedSet = new Set(selectedIncomeIds);
    for (const b of userBudgets) {
      if (b.incomeSourceId && availableIncomeIdSet.has(b.incomeSourceId)) {
        selectedSet.add(b.incomeSourceId);
      }
    }
    selectedIncomeIds = Array.from(selectedSet);
  }

  const selectedIncomeSet = new Set(selectedIncomeIds);
  const selectedIncomesSum = roundCurrency(
    availableIncomes
      .filter((inc) => selectedIncomeSet.has(inc.id))
      .reduce((acc, inc) => acc + inc.amount, 0),
  );

  // 3. Receitas do mês anterior (para calcular a variação percentual)
  const prevMonthDate = subMonths(parseISO(`${month}-01`), 1);
  const prevMonthStr = format(prevMonthDate, "yyyy-MM");
  const prevCondition = buildGlobalCompetencyCondition(prevMonthStr, closingDay, userId, allCards);

  const prevIncomeTransactions = await db
    .select()
    .from(transactions)
    .where(and(prevCondition, eq(transactions.type, "income"), ne(transactions.status, "ignored")));

  const prevIncome = prevIncomeTransactions.reduce((acc, t) => acc + Number(t.amount), 0);

  // 4. Média histórica (últimos 3 meses anteriores)
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

  const historicalAverageIncome =
    pastMonthsCount > 0 ? totalPastIncome / pastMonthsCount : selectedIncomesSum || 0;

  // Se há receitas disponíveis no mês, a Receita Prevista reflete exatamente a soma das receitas selecionadas
  const projectedIncome =
    availableIncomes.length > 0 ? selectedIncomesSum : historicalAverageIncome;

  const incomeVariationPercent =
    prevIncome > 0 ? ((projectedIncome - prevIncome) / prevIncome) * 100 : 0;

  // 5. Categorias e Subcategorias do usuário
  const userCategories = await db.query.categories.findMany({
    where: and(eq(categories.userId, userId), eq(categories.type, "expense")),
    with: {
      subcategories: true,
    },
  });

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

  // 7. Montagem hierárquica e cálculo de consumo (Regra 6.3: sem duplicidade entre pai e subcategorias)
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
      const effective = subTxs
        .filter((t) => t.status === "paid")
        .reduce((acc, t) => acc + Number(t.amount), 0);
      const pending = subTxs
        .filter((t) => t.status === "pending")
        .reduce((acc, t) => acc + Number(t.amount), 0);
      const consumed = effective + pending;

      const subBudget = userBudgets.find((b) => b.categoryId === cat.id && b.subcategoryId === sub.id);
      const limit = subBudget ? Number(subBudget.amount) : 0;
      const percent = limit > 0 ? (consumed / limit) * 100 : 0;
      const validIncomeSource =
        subBudget?.incomeSourceId && selectedIncomeSet.has(subBudget.incomeSourceId)
          ? subBudget.incomeSourceId
          : null;

      return {
        id: sub.id,
        name: sub.name,
        budgetId: subBudget?.id,
        limit,
        consumed,
        effective,
        pending,
        percent,
        incomeSourceId: validIncomeSource,
      };
    });

    // Total de consumo da categoria pai
    const catEffective = catTxs
      .filter((t) => t.status === "paid")
      .reduce((acc, t) => acc + Number(t.amount), 0);
    const catPending = catTxs
      .filter((t) => t.status === "pending")
      .reduce((acc, t) => acc + Number(t.amount), 0);
    const catConsumed = catEffective + catPending;

    // Regra 6.3: Se há subcategorias orçadas (subLimitsSum > 0), o limite da categoria é
    // composto exclusivamente pela soma das subcategorias, evitando duplicar pai + filhos.
    const subLimitsSum = roundCurrency(subList.reduce((acc, s) => acc + s.limit, 0));
    const hasBudgetedSubcategories = subLimitsSum > 0;
    const catLimit = hasBudgetedSubcategories
      ? subLimitsSum
      : parentBudget
        ? roundCurrency(Number(parentBudget.amount))
        : 0;

    const firstBudgetedSubRecord = userBudgets.find(
      (b) => b.categoryId === cat.id && b.subcategoryId !== null && Number(b.amount) > 0,
    );
    const pillar: BudgetPillar =
      (parentBudget?.pillar as BudgetPillar) ||
      (firstBudgetedSubRecord?.pillar as BudgetPillar) ||
      "needs";

    const catPercent = catLimit > 0 ? (catConsumed / catLimit) * 100 : 0;
    const parentIncomeSourceId =
      !hasBudgetedSubcategories &&
      parentBudget?.incomeSourceId &&
      selectedIncomeSet.has(parentBudget.incomeSourceId)
        ? parentBudget.incomeSourceId
        : null;

    if (catLimit > 0 || catConsumed > 0 || parentBudget) {
      hierarchyList.push({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || "Tag",
        budgetId: hasBudgetedSubcategories ? undefined : parentBudget?.id,
        pillar,
        limit: catLimit,
        consumed: catConsumed,
        effective: catEffective,
        pending: catPending,
        percent: catPercent,
        incomeSourceId: parentIncomeSourceId,
        subcategories: subList,
      });

      committedBudget = roundCurrency(committedBudget + catLimit);
      if (pillar === "needs") needsTotal = roundCurrency(needsTotal + catLimit);
      else if (pillar === "lifestyle") lifestyleTotal = roundCurrency(lifestyleTotal + catLimit);
      else if (pillar === "goals") goalsTotal = roundCurrency(goalsTotal + catLimit);
    }
  }

  // 8. Totais e Distribuição por Pilar
  const freeBalance = roundCurrency(projectedIncome - committedBudget);
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
    icon: c.icon || "Tag",
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
    availableIncomes,
    selectedIncomeIds,
    hasCustomIncomeSelection,
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
  incomeSourceId?: string | null;
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

    // Verifica se a categoria pertence ao usuário
    const [cat] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, data.categoryId), eq(categories.userId, userId)))
      .limit(1);

    if (!cat) {
      return { success: false, error: "Categoria inválida." };
    }

    if (subcatId) {
      const [sub] = await db
        .select()
        .from(subcategories)
        .where(
          and(
            eq(subcategories.id, subcatId),
            eq(subcategories.categoryId, data.categoryId),
            eq(subcategories.userId, userId),
          ),
        )
        .limit(1);
      if (!sub) {
        return { success: false, error: "Subcategoria inválida." };
      }
    }

    // Se houver uma receita vinculada, valida a capacidade no servidor
    if (data.incomeSourceId) {
      const [appSettings] = await db
        .select()
        .from(settings)
        .where(eq(settings.userId, userId))
        .limit(1);
      const closingDay = appSettings?.closingDay || 25;
      const allCards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));
      const availableIncomes = await fetchMonthAvailableIncomes(
        userId,
        data.month,
        closingDay,
        allCards,
      );
      const targetIncome = availableIncomes.find((inc) => inc.id === data.incomeSourceId);

      if (!targetIncome) {
        return {
          success: false,
          error: "A receita de destino selecionada não existe para este período.",
        };
      }

      const monthBudgets = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.userId, userId), eq(budgets.month, data.month)));

      const otherAllocated = monthBudgets
        .filter((b) => {
          if (data.id && b.id === data.id) return false;
          if (
            b.categoryId === data.categoryId &&
            (subcatId ? b.subcategoryId === subcatId : b.subcategoryId === null)
          ) {
            return false;
          }
          // Se estamos salvando uma subcategoria, ignora eventual teto pai antigo desta mesma categoria
          if (subcatId && b.categoryId === data.categoryId && b.subcategoryId === null) {
            return false;
          }
          return b.incomeSourceId === data.incomeSourceId;
        })
        .reduce((acc, b) => acc + Number(b.amount), 0);

      const remaining = roundCurrency(targetIncome.amount - otherAllocated);
      if (data.amount > remaining + 0.005) {
        const formatBRL = (val: number) =>
          new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
        return {
          success: false,
          error: `Capacidade insuficiente na receita "${targetIncome.name}". Disponível: ${formatBRL(Math.max(0, remaining))}.`,
        };
      }
    }

    await db.transaction(async (tx) => {
      // Regra 6.3: Se o usuário está definindo orçamento em subcategoria, remove eventual
      // registro de teto pai (subcategoryId IS NULL) da mesma categoria no mês para evitar duplicidade.
      if (subcatId !== null) {
        await tx
          .delete(budgets)
          .where(
            and(
              eq(budgets.userId, userId),
              eq(budgets.month, data.month),
              eq(budgets.categoryId, data.categoryId),
              isNull(budgets.subcategoryId),
            ),
          );
      }

      if (data.id) {
        const updatePayload: {
          amount: string;
          pillar: string;
          updatedAt: Date;
          incomeSourceId?: string | null;
        } = {
          amount: data.amount.toFixed(2),
          pillar: data.pillar,
          updatedAt: new Date(),
        };
        if (data.incomeSourceId !== undefined) {
          updatePayload.incomeSourceId = data.incomeSourceId;
        }

        await tx
          .update(budgets)
          .set(updatePayload)
          .where(and(eq(budgets.id, data.id), eq(budgets.userId, userId)));
      } else {
        const existing = await tx
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
          const updatePayload: {
            amount: string;
            pillar: string;
            updatedAt: Date;
            incomeSourceId?: string | null;
          } = {
            amount: data.amount.toFixed(2),
            pillar: data.pillar,
            updatedAt: new Date(),
          };
          if (data.incomeSourceId !== undefined) {
            updatePayload.incomeSourceId = data.incomeSourceId;
          }

          await tx.update(budgets).set(updatePayload).where(eq(budgets.id, existing[0].id));
        } else {
          await tx.insert(budgets).values({
            userId,
            categoryId: data.categoryId,
            subcategoryId: subcatId,
            amount: data.amount.toFixed(2),
            pillar: data.pillar,
            month: data.month,
            incomeSourceId: data.incomeSourceId ?? null,
          });
        }
      }
    });

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

export interface SaveBudgetPlanInput {
  month: string;
  selectedIncomeIds: string[];
  items: Array<{
    budgetId?: number;
    categoryId: number;
    subcategoryId: number | null;
    amount: number;
    pillar: BudgetPillar;
    incomeSourceId: string | null;
  }>;
}

/**
 * Salva de uma só vez a seleção de receitas do mês, as alocações entre despesas e receitas
 * e eventuais ajustes de valores orçados do Planejador Visual de Orçamento.
 */
export async function saveBudgetPlan(
  input: SaveBudgetPlanInput,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Não autorizado." };
  const userId = session.user.id;

  if (!/^\d{4}-\d{2}$/.test(input.month)) {
    return { success: false, error: "Período inválido." };
  }

  try {
    const [appSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId))
      .limit(1);
    const closingDay = appSettings?.closingDay || 25;
    const allCards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));

    const [availableIncomes, userCategories, userSubcategories] = await Promise.all([
      fetchMonthAvailableIncomes(userId, input.month, closingDay, allCards),
      db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.userId, userId), eq(categories.type, "expense"))),
      db
        .select({ id: subcategories.id, categoryId: subcategories.categoryId })
        .from(subcategories)
        .where(eq(subcategories.userId, userId)),
    ]);

    const availableIncomeMap = new Map(availableIncomes.map((inc) => [inc.id, inc]));
    const validSelectedIncomeIds = Array.from(
      new Set(input.selectedIncomeIds.filter((id) => availableIncomeMap.has(id))),
    );
    const selectedIncomeSet = new Set(validSelectedIncomeIds);

    const validCatIds = new Set(userCategories.map((c) => c.id));
    const subToCatMap = new Map(userSubcategories.map((s) => [s.id, s.categoryId]));

    // Validação de integridade das linhas orçamentárias e soma por receita
    const allocatedByIncome = new Map<string, number>();
    const categoriesWithSubs = new Set<number>();
    const categoriesWithParent = new Set<number>();

    for (const item of input.items) {
      if (!validCatIds.has(item.categoryId)) {
        return { success: false, error: "Uma ou mais categorias não pertencem ao usuário." };
      }

      if (item.subcategoryId !== null) {
        const ownerCatId = subToCatMap.get(item.subcategoryId);
        if (ownerCatId !== item.categoryId) {
          return {
            success: false,
            error: "Subcategoria inválida para a categoria informada.",
          };
        }
        categoriesWithSubs.add(item.categoryId);
      } else {
        categoriesWithParent.add(item.categoryId);
      }

      if (item.amount <= 0 || Number.isNaN(item.amount)) {
        return {
          success: false,
          error: "Todos os itens orçados devem possuir valor maior que zero.",
        };
      }

      if (item.incomeSourceId !== null) {
        if (!selectedIncomeSet.has(item.incomeSourceId)) {
          return {
            success: false,
            error: "Uma despesa foi vinculada a uma receita que não está selecionada para o mês.",
          };
        }

        const prev = allocatedByIncome.get(item.incomeSourceId) || 0;
        allocatedByIncome.set(item.incomeSourceId, roundCurrency(prev + item.amount));
      }
    }

    // Regra 6.3: Impede duplicidade simultânea entre categoria pai e subcategoria
    for (const catId of categoriesWithSubs) {
      if (categoriesWithParent.has(catId)) {
        return {
          success: false,
          error:
            "Conflito de hierarquia: uma categoria não pode ser orçada simultaneamente pelo teto pai e por subcategorias.",
        };
      }
    }

    // Regra 6.2: Valida capacidade de cada receita selecionada
    const formatBRL = (val: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

    for (const [incomeId, totalAllocated] of allocatedByIncome.entries()) {
      const income = availableIncomeMap.get(incomeId);
      if (!income) {
        return { success: false, error: "Receita de destino não encontrada." };
      }
      if (totalAllocated > income.amount + 0.01) {
        return {
          success: false,
          error: `O total alocado em "${income.name}" (${formatBRL(totalAllocated)}) excede o valor da receita (${formatBRL(income.amount)}).`,
        };
      }
    }

    // Persistência transacional
    await db.transaction(async (tx) => {
      // 1. Salva a seleção de receitas do mês
      const existingConfig = await tx
        .select()
        .from(budgetMonthConfigs)
        .where(
          and(eq(budgetMonthConfigs.userId, userId), eq(budgetMonthConfigs.month, input.month)),
        )
        .limit(1);

      if (existingConfig.length > 0) {
        await tx
          .update(budgetMonthConfigs)
          .set({
            selectedIncomeIds: validSelectedIncomeIds,
            updatedAt: new Date(),
          })
          .where(eq(budgetMonthConfigs.id, existingConfig[0].id));
      } else {
        await tx.insert(budgetMonthConfigs).values({
          userId,
          month: input.month,
          selectedIncomeIds: validSelectedIncomeIds,
          updatedAt: new Date(),
        });
      }

      // 2. Busca os registros atuais de orçamento do mês para atualizar ou inserir com segurança
      const currentMonthBudgets = await tx
        .select()
        .from(budgets)
        .where(and(eq(budgets.userId, userId), eq(budgets.month, input.month)));

      // Remove tetos pai de categorias que agora possuem subcategorias orçadas
      for (const catId of categoriesWithSubs) {
        await tx
          .delete(budgets)
          .where(
            and(
              eq(budgets.userId, userId),
              eq(budgets.month, input.month),
              eq(budgets.categoryId, catId),
              isNull(budgets.subcategoryId),
            ),
          );
      }

      for (const item of input.items) {
        const match = currentMonthBudgets.find(
          (b) =>
            (item.budgetId && b.id === item.budgetId) ||
            (b.categoryId === item.categoryId &&
              (item.subcategoryId === null
                ? b.subcategoryId === null
                : b.subcategoryId === item.subcategoryId)),
        );

        if (match) {
          await tx
            .update(budgets)
            .set({
              amount: roundCurrency(item.amount).toFixed(2),
              pillar: item.pillar,
              incomeSourceId: item.incomeSourceId,
              updatedAt: new Date(),
            })
            .where(and(eq(budgets.id, match.id), eq(budgets.userId, userId)));
        } else {
          await tx.insert(budgets).values({
            userId,
            categoryId: item.categoryId,
            subcategoryId: item.subcategoryId,
            amount: roundCurrency(item.amount).toFixed(2),
            pillar: item.pillar,
            month: input.month,
            incomeSourceId: item.incomeSourceId,
          });
        }
      }
    });

    revalidatePath("/budgets");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar planejamento de orçamento:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao salvar planejamento de orçamento.",
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
