"use client";

import { BudgetExecutiveCards } from "@/app/(main)/budgets/budget-executive-cards";
import { BudgetHierarchyList } from "@/app/(main)/budgets/budget-hierarchy-list";
import { BudgetIncomeSelector } from "@/app/(main)/budgets/budget-income-selector";
import { BudgetItemDetailsSheet } from "@/app/(main)/budgets/budget-item-details-sheet";
import { BudgetLimitDialog, type BudgetEditTarget } from "@/app/(main)/budgets/budget-limit-dialog";
import { BudgetVisualPlanner } from "@/app/(main)/budgets/budget-visual-planner";
import {
  deleteBudgetLimit,
  getBudgetData,
  saveBudgetPlan,
  type BudgetData,
  type BudgetPillar,
  type CategoryBudgetHierarchy,
  type PillarDistribution,
} from "@/app/actions/budgets";
import { ClientDataLoader } from "@/components/client-data-loader";
import { Button } from "@/components/ui/button";
import {
  calculateBudgetPlannerSummary,
  extractEffectiveBudgetItems,
  roundCurrency,
  type BudgetPlanItem,
} from "@/lib/budget-planner-utils";
import type { UnbudgetedCategoryItem } from "@/lib/budget-treemap-layout";
import { AlertTriangle, CheckCircle2, Flame, Plus, RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

interface BudgetsClientPageProps {
  initialData: BudgetData;
  closingDay: number;
}

interface MonthBudgetWorkspaceProps {
  data: BudgetData;
  selectedMonth: string;
  onRefreshData: () => Promise<void>;
}

function MonthBudgetWorkspace({ data, selectedMonth, onRefreshData }: MonthBudgetWorkspaceProps) {
  const router = useRouter();

  // Sincroniza o estado local quando os dados do servidor (ou mês selecionado) mudam
  const [prevDataRef, setPrevDataRef] = useState<BudgetData>(data);
  const [selectedIncomeIds, setSelectedIncomeIds] = useState<string[]>(data.selectedIncomeIds);
  const [localCategories, setLocalCategories] = useState<CategoryBudgetHierarchy[]>(data.categories);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetEditTarget | null>(null);

  const [detailsItemKey, setDetailsItemKey] = useState<string | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);

  if (data !== prevDataRef) {
    setPrevDataRef(data);
    setSelectedIncomeIds(data.selectedIncomeIds);
    setLocalCategories(data.categories);
    setHasUnsavedChanges(false);
  }

  const selectedIncomes = useMemo(() => {
    const idSet = new Set(selectedIncomeIds);
    return data.availableIncomes.filter((inc) => idSet.has(inc.id));
  }, [data.availableIncomes, selectedIncomeIds]);

  const effectiveItems = useMemo(() => extractEffectiveBudgetItems(localCategories), [localCategories]);

  const plannerSummary = useMemo(
    () => calculateBudgetPlannerSummary(selectedIncomes, effectiveItems),
    [selectedIncomes, effectiveItems],
  );

  // Calcula a distribuição por pilar em tempo real com base no estado local
  const livePillars = useMemo((): PillarDistribution => {
    let needsTotal = 0;
    let lifestyleTotal = 0;
    let goalsTotal = 0;

    for (const item of effectiveItems) {
      if (item.pillar === "needs") needsTotal += item.amount;
      else if (item.pillar === "lifestyle") lifestyleTotal += item.amount;
      else if (item.pillar === "goals") goalsTotal += item.amount;
    }

    const baseForDistribution = Math.max(plannerSummary.selectedIncomeTotal, plannerSummary.totalBudgetedExpenses, 1);
    const freeForPillars = Math.max(0, plannerSummary.projectedBalance);

    return {
      needsAmount: roundCurrency(needsTotal),
      needsPercent: (needsTotal / baseForDistribution) * 100,
      lifestyleAmount: roundCurrency(lifestyleTotal),
      lifestylePercent: (lifestyleTotal / baseForDistribution) * 100,
      goalsAmount: roundCurrency(goalsTotal),
      goalsPercent: (goalsTotal / baseForDistribution) * 100,
      freeAmount: roundCurrency(freeForPillars),
      freePercent: (freeForPillars / baseForDistribution) * 100,
    };
  }, [effectiveItems, plannerSummary]);

  const activeDetailsItem = useMemo(
    () => (detailsItemKey ? (effectiveItems.find((i) => i.itemKey === detailsItemKey) ?? null) : null),
    [detailsItemKey, effectiveItems],
  );

  const unbudgetedItems = useMemo<UnbudgetedCategoryItem[]>(() => {
    return localCategories
      .filter((cat) => cat.limit <= 0 && cat.consumed > 0)
      .map((cat) => ({
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        consumed: roundCurrency(cat.consumed),
        effective: roundCurrency(cat.effective),
        pending: roundCurrency(cat.pending),
      }))
      .sort((a, b) => b.consumed - a.consumed);
  }, [localCategories]);

  const monthExecution = useMemo(() => {
    const budgetedConsumed = roundCurrency(effectiveItems.reduce((acc, item) => acc + item.consumed, 0));
    const totalConsumedAll = roundCurrency(localCategories.reduce((acc, cat) => acc + cat.consumed, 0));
    const unbudgetedConsumed = roundCurrency(Math.max(0, totalConsumedAll - budgetedConsumed));
    const totalBudgeted = roundCurrency(effectiveItems.reduce((acc, item) => acc + item.amount, 0));
    const exceededItems = effectiveItems
      .filter((item) => item.amount > 0 && item.consumed > item.amount)
      .sort((a, b) => b.consumed - b.amount - (a.consumed - a.amount));
    const warningItems = effectiveItems.filter(
      (item) => item.amount > 0 && item.consumed <= item.amount && item.percent >= 75,
    );

    return {
      totalConsumed: budgetedConsumed,
      unbudgetedConsumed,
      totalBudgeted,
      overallPercent: totalBudgeted > 0 ? (budgetedConsumed / totalBudgeted) * 100 : 0,
      exceededItems,
      warningCount: warningItems.length,
    };
  }, [localCategories, effectiveItems]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  // Alterna seleção de uma receita fixa para o mês
  const handleToggleIncome = useCallback(
    (incomeId: string) => {
      const isCurrentlySelected = selectedIncomeIds.includes(incomeId);
      if (isCurrentlySelected) {
        const nextIds = selectedIncomeIds.filter((id) => id !== incomeId);
        const unlinkedCount = effectiveItems.filter((item) => item.incomeSourceId === incomeId).length;

        setSelectedIncomeIds(nextIds);
        if (unlinkedCount > 0) {
          setLocalCategories((prev) =>
            prev.map((cat) => ({
              ...cat,
              incomeSourceId: cat.incomeSourceId === incomeId ? null : cat.incomeSourceId,
              subcategories: cat.subcategories.map((sub) => ({
                ...sub,
                incomeSourceId: sub.incomeSourceId === incomeId ? null : sub.incomeSourceId,
              })),
            })),
          );
          toast.info(
            `Receita desmarcada. ${unlinkedCount} ${unlinkedCount === 1 ? "categoria foi movida" : "categorias foram movidas"} para a bandeja sem vínculo.`,
          );
        }
      } else {
        setSelectedIncomeIds((prev) => [...prev, incomeId]);
      }
      setHasUnsavedChanges(true);
    },
    [selectedIncomeIds, effectiveItems],
  );

  const handleSelectAllIncomes = useCallback(() => {
    setSelectedIncomeIds(data.availableIncomes.map((inc) => inc.id));
    setHasUnsavedChanges(true);
  }, [data.availableIncomes]);

  // Atualiza vínculo de receita de um bloco via Drag and Drop
  const handleAllocateItem = useCallback((itemKey: string, targetIncomeId: string | null) => {
    setLocalCategories((prev) =>
      prev.map((cat) => {
        if (itemKey === `cat:${cat.id}`) {
          return {
            ...cat,
            incomeSourceId: targetIncomeId,
          };
        }
        if (itemKey.startsWith("sub:")) {
          const subId = Number(itemKey.replace("sub:", ""));
          if (cat.subcategories.some((s) => s.id === subId)) {
            return {
              ...cat,
              subcategories: cat.subcategories.map((sub) =>
                sub.id === subId ? { ...sub, incomeSourceId: targetIncomeId } : sub,
              ),
            };
          }
        }
        return cat;
      }),
    );
    setHasUnsavedChanges(true);
  }, []);

  // Atualiza valor, pilar e vínculo de receita via Painel de Detalhes
  const handleUpdateItemDetails = useCallback(
    (
      itemKey: string,
      updates: {
        amount: number;
        pillar: BudgetPillar;
        incomeSourceId: string | null;
      },
    ) => {
      setLocalCategories((prev) =>
        prev.map((cat) => {
          if (itemKey === `cat:${cat.id}`) {
            const newLimit = roundCurrency(updates.amount);
            return {
              ...cat,
              limit: newLimit,
              pillar: updates.pillar,
              incomeSourceId: updates.incomeSourceId,
              percent: newLimit > 0 ? (cat.consumed / newLimit) * 100 : 0,
            };
          }
          if (itemKey.startsWith("sub:")) {
            const subId = Number(itemKey.replace("sub:", ""));
            if (cat.subcategories.some((s) => s.id === subId)) {
              const updatedSubs = cat.subcategories.map((sub) => {
                if (sub.id !== subId) return sub;
                const newSubLimit = roundCurrency(updates.amount);
                return {
                  ...sub,
                  limit: newSubLimit,
                  incomeSourceId: updates.incomeSourceId,
                  percent: newSubLimit > 0 ? (sub.consumed / newSubLimit) * 100 : 0,
                };
              });
              const newCatLimit = roundCurrency(updatedSubs.reduce((acc, s) => acc + s.limit, 0));
              return {
                ...cat,
                limit: newCatLimit,
                pillar: updates.pillar,
                percent: newCatLimit > 0 ? (cat.consumed / newCatLimit) * 100 : 0,
                subcategories: updatedSubs,
              };
            }
          }
          return cat;
        }),
      );
      setHasUnsavedChanges(true);
    },
    [],
  );

  // Sugestão inteligente de distribuição automática (First-Fit Decreasing respeitando capacidade)
  const handleAutoDistribute = useCallback(() => {
    const remainingByIncome = new Map<string, number>();
    for (const summary of plannerSummary.incomeSummaries) {
      remainingByIncome.set(summary.income.id, summary.remainingCapacity);
    }

    const sortedUnallocated = [...plannerSummary.unallocatedItems].sort((a, b) => b.amount - a.amount);

    const assignments = new Map<string, string>();
    for (const item of sortedUnallocated) {
      // Escolhe a receita com maior saldo disponível que comporte o item
      const candidateIncomes = [...selectedIncomes].sort(
        (a, b) => (remainingByIncome.get(b.id) || 0) - (remainingByIncome.get(a.id) || 0),
      );

      for (const inc of candidateIncomes) {
        const rem = remainingByIncome.get(inc.id) || 0;
        if (item.amount <= rem + 0.005) {
          assignments.set(item.itemKey, inc.id);
          remainingByIncome.set(inc.id, roundCurrency(rem - item.amount));
          break;
        }
      }
    }

    if (assignments.size === 0) {
      toast.warning(
        "Nenhuma categoria sem vínculo pôde ser encaixada automaticamente na capacidade restante das receitas.",
      );
      return;
    }

    setLocalCategories((prev) =>
      prev.map((cat) => {
        const catAssignment = assignments.get(`cat:${cat.id}`);
        return {
          ...cat,
          incomeSourceId: catAssignment ?? cat.incomeSourceId,
          subcategories: cat.subcategories.map((sub) => {
            const subAssignment = assignments.get(`sub:${sub.id}`);
            return {
              ...sub,
              incomeSourceId: subAssignment ?? sub.incomeSourceId,
            };
          }),
        };
      }),
    );
    setHasUnsavedChanges(true);
    toast.success(
      `${assignments.size} ${assignments.size === 1 ? "categoria foi distribuída" : "categorias foram distribuídas"} automaticamente! Clique em "Salvar Orçamento" para confirmar.`,
    );
  }, [plannerSummary, selectedIncomes]);

  const handleDiscardChanges = useCallback(() => {
    setSelectedIncomeIds(data.selectedIncomeIds);
    setLocalCategories(data.categories);
    setHasUnsavedChanges(false);
    toast.info("Alterações locais descartadas.");
  }, [data]);

  const handleSavePlan = useCallback(async () => {
    setIsSavingPlan(true);
    try {
      const currentItems = extractEffectiveBudgetItems(localCategories);
      const res = await saveBudgetPlan({
        month: selectedMonth,
        selectedIncomeIds,
        items: currentItems.map((item) => ({
          budgetId: item.budgetId,
          categoryId: item.categoryId,
          subcategoryId: item.subcategoryId,
          amount: item.amount,
          pillar: item.pillar,
          incomeSourceId: item.incomeSourceId,
        })),
      });

      if (res.success) {
        setHasUnsavedChanges(false);
        toast.success("Planejamento de orçamento salvo com sucesso!");
        await onRefreshData();
        router.refresh();
      } else {
        toast.error(res.error || "Não foi possível salvar o planejamento.");
      }
    } catch (error) {
      console.error("Erro ao salvar planejamento:", error);
      toast.error("Erro inesperado ao salvar o orçamento.");
    } finally {
      setIsSavingPlan(false);
    }
  }, [localCategories, selectedMonth, selectedIncomeIds, onRefreshData, router]);

  const handleDeleteFromDetails = useCallback(
    async (item: BudgetPlanItem) => {
      if (!item.budgetId) return;
      if (!confirm(`Deseja realmente remover o orçamento de "${item.label}"?`)) return;

      const res = await deleteBudgetLimit(item.budgetId);
      if (res.success) {
        toast.success("Limite orçamentário removido!");
        setDetailsSheetOpen(false);
        await onRefreshData();
        router.refresh();
      } else {
        toast.error(res.error || "Erro ao remover orçamento.");
      }
    },
    [onRefreshData, router],
  );

  const handleOpenNew = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleEdit = (target: BudgetEditTarget) => {
    setEditTarget(target);
    setDialogOpen(true);
  };

  const handleSelectItemInPlanner = (item: BudgetPlanItem) => {
    setDetailsItemKey(item.itemKey);
    setDetailsSheetOpen(true);
  };

  const handleOpenItemDetailsByKey = (itemKey: string) => {
    setDetailsItemKey(itemKey);
    setDetailsSheetOpen(true);
  };

  const handleSelectUnbudgetedCategory = (item: UnbudgetedCategoryItem) => {
    setEditTarget({
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      amount: item.consumed,
      pillar: "lifestyle",
      incomeSourceId: null,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 mt-4 pb-24">
      {/* Barra superior rápida de ações do Orçamento */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/70 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`}
          />
          <span>
            {hasUnsavedChanges
              ? "Existem alocações ou ajustes globais pendentes de salvamento."
              : "Orçamento global sincronizado. O seletor acima exibe os gastos reais do mês."}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {hasUnsavedChanges && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSavingPlan}
              onClick={handleDiscardChanges}
              className="h-9 rounded-xl border-white/10 text-xs gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Descartar
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSavePlan}
            disabled={isSavingPlan || !hasUnsavedChanges}
            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSavingPlan ? "Salvando..." : "Salvar Orçamento"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenNew}
            className="h-9 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl px-3.5 text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Orçamento</span>
          </Button>
        </div>
      </div>

      {/* 1. Seleção das Receitas Fixas do Mês */}
      <BudgetIncomeSelector
        availableIncomes={data.availableIncomes}
        selectedIncomeIds={selectedIncomeIds}
        items={effectiveItems}
        onToggleIncome={handleToggleIncome}
        onSelectAll={handleSelectAllIncomes}
      />

      {/* 2. Indicadores Financeiros Resumidos & Barra por Pilar (Seção 4.1) */}
      <BudgetExecutiveCards
        summary={plannerSummary}
        incomeVariationPercent={data.incomeVariationPercent}
        pillars={livePillars}
        selectedIncomesCount={selectedIncomes.length}
        totalAvailableIncomesCount={data.availableIncomes.length}
      />

      {/* 2.5 Leitura Mensal: Gasto Realizado vs Planejado + Alertas de Limite Ultrapassado */}
      {monthExecution.totalBudgeted > 0 && (
        <div
          className={`backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 border shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.35)] space-y-3 ${
            monthExecution.exceededItems.length > 0
              ? "bg-rose-950/20 border-rose-500/30"
              : "bg-card/70 border-white/[0.08]"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  monthExecution.exceededItems.length > 0
                    ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    : monthExecution.warningCount > 0
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {monthExecution.exceededItems.length > 0 ? (
                  <Flame className="w-4 h-4" />
                ) : monthExecution.warningCount > 0 ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  {monthExecution.exceededItems.length > 0
                    ? `${monthExecution.exceededItems.length} ${
                        monthExecution.exceededItems.length === 1
                          ? "item ultrapassou o limite pensado"
                          : "itens ultrapassaram o limite pensado"
                      } neste mês`
                    : monthExecution.warningCount > 0
                      ? `${monthExecution.warningCount} ${
                          monthExecution.warningCount === 1
                            ? "item próximo do limite"
                            : "itens próximos do limite"
                        } (>= 75%) neste mês`
                      : "Todos os gastos do mês estão dentro do planejado"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Consumo nos itens orçados:{" "}
                  <strong className="text-foreground tabular-nums">
                    {formatCurrency(monthExecution.totalConsumed)}
                  </strong>{" "}
                  de{" "}
                  <strong className="text-foreground tabular-nums">
                    {formatCurrency(monthExecution.totalBudgeted)}
                  </strong>{" "}
                  orçados ({monthExecution.overallPercent.toFixed(1)}%)
                  {monthExecution.unbudgetedConsumed > 0 && (
                    <span>
                      {" "}
                      •{" "}
                      <strong className="text-amber-400 tabular-nums">
                        +{formatCurrency(monthExecution.unbudgetedConsumed)}
                      </strong>{" "}
                      sem limite definido
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {monthExecution.exceededItems.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {monthExecution.exceededItems.map((item) => {
                const exceededBy = roundCurrency(item.consumed - item.amount);
                return (
                  <button
                    key={item.itemKey}
                    type="button"
                    onClick={() => handleOpenItemDetailsByKey(item.itemKey)}
                    className="text-left text-xs px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-200 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span className="font-semibold">
                      {item.subcategoryName ? `${item.categoryName} • ${item.subcategoryName}` : item.categoryName}
                    </span>
                    <span className="text-rose-400 font-bold tabular-nums">
                      +{formatCurrency(exceededBy)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Planejador Visual de Orçamento com Treemap e Drag and Drop (Seção 4.2, 5, 6, 7) */}
      <BudgetVisualPlanner
        summary={plannerSummary}
        selectedIncomes={selectedIncomes}
        allItems={effectiveItems}
        unbudgetedItems={unbudgetedItems}
        onAllocateItem={handleAllocateItem}
        onSelectItem={handleSelectItemInPlanner}
        onSelectUnbudgetedCategory={handleSelectUnbudgetedCategory}
        onAutoDistribute={handleAutoDistribute}
      />

      {/* 4. Listagem Hierárquica Detalhada de Categorias e Subcategorias */}
      <BudgetHierarchyList
        categories={localCategories}
        selectedIncomes={selectedIncomes}
        onEditLimit={handleEdit}
        onOpenItemDetails={handleOpenItemDetailsByKey}
        onAddNew={handleOpenNew}
      />

      {/* 5. Painel Lateral de Detalhes e Edição ao clicar em um bloco (Seção 8) */}
      <BudgetItemDetailsSheet
        item={activeDetailsItem}
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        selectedIncomes={selectedIncomes}
        allItems={effectiveItems}
        onUpdateItem={handleUpdateItemDetails}
        onDeleteItem={handleDeleteFromDetails}
      />

      {/* 6. Modal de Novo / Editar Limite Orçamentário */}
      <BudgetLimitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        month={selectedMonth}
        freeBalance={plannerSummary.projectedBalance}
        categories={data.allExpenseCategories}
        selectedIncomes={selectedIncomes}
        allItems={effectiveItems}
        editTarget={editTarget}
        onSuccess={onRefreshData}
      />

      {/* Barra Flutuante de Salvamento quando há alterações pendentes */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-36 md:bottom-20 left-4 right-4 md:left-auto md:right-6 z-40 md:w-[480px] animate-in slide-in-from-bottom-6 duration-200">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-card/90 p-3.5 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Save className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                  Alterações não salvas no orçamento
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Salve para persistir seu planejamento global.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDiscardChanges}
                disabled={isSavingPlan}
                className="h-9 rounded-xl border-white/10 text-xs cursor-pointer"
              >
                Descartar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSavePlan}
                disabled={isSavingPlan}
                className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs gap-1.5 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                {isSavingPlan ? "Salvando..." : "Salvar Orçamento"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BudgetsClientPage({ initialData, closingDay }: BudgetsClientPageProps) {
  const [freshDataOverride, setFreshDataOverride] = useState<BudgetData | null>(null);

  const fetchMonthBudget = useCallback(async (month: string) => {
    const res = await getBudgetData(month);
    setFreshDataOverride(res);
    return res;
  }, []);

  return (
    <ClientDataLoader
      closingDay={closingDay}
      initialData={freshDataOverride ?? initialData}
      fetchAction={fetchMonthBudget}
      headerContent={() => (
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Orçamento Global</h1>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              Base Fixa • Leitura Mensal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Defina seus limites uma única vez com base nas receitas fixas e acompanhe em cada mês onde está gastando mais.
          </p>
        </div>
      )}
    >
      {(budget, selectedMonth) => (
        <MonthBudgetWorkspace
          data={budget}
          selectedMonth={selectedMonth}
          onRefreshData={async () => {
            await fetchMonthBudget(selectedMonth);
          }}
        />
      )}
    </ClientDataLoader>
  );
}
