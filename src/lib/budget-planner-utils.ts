import type { BudgetPillar, CategoryBudgetHierarchy } from "@/app/actions/budgets";

export interface BudgetIncomeSource {
  id: string;
  name: string;
  amount: number;
  categoryName: string;
  accountName: string | null;
  isFixed: boolean;
  sourceType: "fixed_template" | "transaction";
}

export interface BudgetPlanItem {
  itemKey: string;
  budgetId?: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  subcategoryId: number | null;
  subcategoryName: string | null;
  label: string;
  amount: number;
  pillar: BudgetPillar;
  incomeSourceId: string | null;
  consumed: number;
  effective: number;
  pending: number;
  percent: number;
}

export interface IncomeAllocationSummary {
  income: BudgetIncomeSource;
  allocatedItems: BudgetPlanItem[];
  allocatedAmount: number;
  remainingCapacity: number;
  committedPercent: number;
  isFull: boolean;
}

export interface BudgetPlannerSummary {
  selectedIncomeTotal: number;
  totalBudgetedExpenses: number;
  projectedBalance: number;
  totalDistributed: number;
  totalUndistributed: number;
  distributedPercent: number;
  hasOverBudgetWarning: boolean;
  incomeSummaries: IncomeAllocationSummary[];
  unallocatedItems: BudgetPlanItem[];
}

export interface AllocationValidationResult {
  valid: boolean;
  reason?: string;
  remainingCapacity: number;
  shortfall: number;
}

const EPSILON = 0.005;

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Regra 6.3: Extrai as linhas orçamentárias efetivamente orçadas, sem duplicar
 * valores entre categoria pai e subcategorias.
 * - Se a categoria possui subcategorias com orçamento > 0, utiliza exclusivamente
 *   essas subcategorias como unidades arrastáveis.
 * - Caso contrário, se a categoria pai possui orçamento > 0, utiliza a categoria pai.
 */
export function extractEffectiveBudgetItems(categories: CategoryBudgetHierarchy[]): BudgetPlanItem[] {
  const items: BudgetPlanItem[] = [];

  for (const cat of categories) {
    const budgetedSubs = cat.subcategories.filter((sub) => sub.limit > 0);

    if (budgetedSubs.length > 0) {
      for (const sub of budgetedSubs) {
        items.push({
          itemKey: `sub:${sub.id}`,
          budgetId: sub.budgetId,
          categoryId: cat.id,
          categoryName: cat.name,
          categoryIcon: cat.icon || "Tag",
          subcategoryId: sub.id,
          subcategoryName: sub.name,
          label: sub.name,
          amount: roundCurrency(sub.limit),
          pillar: cat.pillar,
          incomeSourceId: sub.incomeSourceId ?? null,
          consumed: roundCurrency(sub.consumed),
          effective: roundCurrency(sub.effective),
          pending: roundCurrency(sub.pending),
          percent: sub.percent,
        });
      }
    } else if (cat.limit > 0) {
      items.push({
        itemKey: `cat:${cat.id}`,
        budgetId: cat.budgetId,
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon || "Tag",
        subcategoryId: null,
        subcategoryName: null,
        label: cat.name,
        amount: roundCurrency(cat.limit),
        pillar: cat.pillar,
        incomeSourceId: cat.incomeSourceId ?? null,
        consumed: roundCurrency(cat.consumed),
        effective: roundCurrency(cat.effective),
        pending: roundCurrency(cat.pending),
        percent: cat.percent,
      });
    }
  }

  return items;
}

/**
 * Regra 6.2: Valida se um item orçamentário (com determinado valor) cabe na capacidade
 * restante da receita de destino.
 */
export function validateAllocationToIncome(
  itemKey: string,
  itemAmount: number,
  targetIncomeId: string | null,
  selectedIncomes: BudgetIncomeSource[],
  allItems: BudgetPlanItem[],
): AllocationValidationResult {
  if (!targetIncomeId) {
    return {
      valid: true,
      remainingCapacity: 0,
      shortfall: 0,
    };
  }

  const targetIncome = selectedIncomes.find((inc) => inc.id === targetIncomeId);
  if (!targetIncome) {
    return {
      valid: false,
      reason: "A receita de destino selecionada não está ativa neste período.",
      remainingCapacity: 0,
      shortfall: itemAmount,
    };
  }

  // Soma todas as outras despesas já vinculadas a esta receita (excluindo o próprio item)
  const otherAllocatedSum = allItems
    .filter((i) => i.itemKey !== itemKey && i.incomeSourceId === targetIncomeId)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const remainingCapacity = roundCurrency(Math.max(0, targetIncome.amount - otherAllocatedSum));

  if (itemAmount <= remainingCapacity + EPSILON) {
    return {
      valid: true,
      remainingCapacity,
      shortfall: 0,
    };
  }

  const shortfall = roundCurrency(itemAmount - remainingCapacity);
  const formatBRL = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return {
    valid: false,
    reason: `Capacidade insuficiente em "${targetIncome.name}". Valor de ${formatBRL(itemAmount)} excede o saldo disponível da receita (${formatBRL(remainingCapacity)}) em ${formatBRL(shortfall)}.`,
    remainingCapacity,
    shortfall,
  };
}

/**
 * Regras 6.1 e 6.2: Calcula todos os indicadores globais e o resumo de cada receita.
 * Garante que:
 * - Despesas orçadas = Total distribuído + Total sem distribuição
 * - Saldo previsto = Receita prevista - Despesas orçadas
 */
export function calculateBudgetPlannerSummary(
  selectedIncomes: BudgetIncomeSource[],
  items: BudgetPlanItem[],
): BudgetPlannerSummary {
  const selectedIncomeIds = new Set(selectedIncomes.map((inc) => inc.id));

  const selectedIncomeTotal = roundCurrency(
    selectedIncomes.reduce((acc, inc) => acc + inc.amount, 0),
  );

  // Itens cujo incomeSourceId pertence a uma receita selecionada são considerados distribuídos;
  // caso contrário, ficam sem distribuição.
  const normalizedItems = items.map((item) => ({
    ...item,
    incomeSourceId:
      item.incomeSourceId && selectedIncomeIds.has(item.incomeSourceId) ? item.incomeSourceId : null,
  }));

  const incomeSummaries: IncomeAllocationSummary[] = selectedIncomes.map((income) => {
    const allocatedItems = normalizedItems
      .filter((item) => item.incomeSourceId === income.id)
      .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));

    const allocatedAmount = roundCurrency(
      allocatedItems.reduce((acc, item) => acc + item.amount, 0),
    );
    const remainingCapacity = roundCurrency(Math.max(0, income.amount - allocatedAmount));
    const committedPercent = income.amount > 0 ? (allocatedAmount / income.amount) * 100 : 0;

    return {
      income,
      allocatedItems,
      allocatedAmount,
      remainingCapacity,
      committedPercent,
      isFull: remainingCapacity <= EPSILON,
    };
  });

  const unallocatedItems = normalizedItems
    .filter((item) => item.incomeSourceId === null)
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));

  const totalDistributed = roundCurrency(
    incomeSummaries.reduce((acc, s) => acc + s.allocatedAmount, 0),
  );
  const totalUndistributed = roundCurrency(
    unallocatedItems.reduce((acc, item) => acc + item.amount, 0),
  );
  const totalBudgetedExpenses = roundCurrency(totalDistributed + totalUndistributed);
  const projectedBalance = roundCurrency(selectedIncomeTotal - totalBudgetedExpenses);
  const distributedPercent =
    totalBudgetedExpenses > 0 ? (totalDistributed / totalBudgetedExpenses) * 100 : 0;

  return {
    selectedIncomeTotal,
    totalBudgetedExpenses,
    projectedBalance,
    totalDistributed,
    totalUndistributed,
    distributedPercent,
    hasOverBudgetWarning: totalBudgetedExpenses > selectedIncomeTotal + EPSILON,
    incomeSummaries,
    unallocatedItems,
  };
}

