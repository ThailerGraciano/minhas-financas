"use client";

import { BudgetExecutiveCards } from "@/app/(main)/budgets/budget-executive-cards";
import { BudgetHierarchyList } from "@/app/(main)/budgets/budget-hierarchy-list";
import { BudgetLimitDialog, type BudgetEditTarget } from "@/app/(main)/budgets/budget-limit-dialog";
import { getBudgetData, type BudgetData } from "@/app/actions/budgets";
import { ClientDataLoader } from "@/components/client-data-loader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

interface BudgetsClientPageProps {
  initialData: BudgetData;
  closingDay: number;
}

export function BudgetsClientPage({ initialData, closingDay }: BudgetsClientPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetEditTarget | null>(null);

  const handleOpenNew = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleEdit = (target: BudgetEditTarget) => {
    setEditTarget(target);
    setDialogOpen(true);
  };

  return (
    <ClientDataLoader
      closingDay={closingDay}
      initialData={initialData}
      fetchAction={getBudgetData}
      headerContent={() => (
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Orçamento Base Zero</h1>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              Zero-Based Budgeting
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Distribua e dê um destino para cada centavo das suas receitas antes do mês começar.
          </p>
        </div>
      )}
      headerActions={() => (
        <Button
          type="button"
          onClick={handleOpenNew}
          className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-sm cursor-pointer transition-all hover:brightness-110 active:scale-95 shrink-0"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Novo Orçamento</span>
        </Button>
      )}
    >
      {(budget, selectedMonth) => (
        <div className="space-y-6 mt-4 pb-12">
          {/* Cards Executivos & Barra por Pilar */}
          <BudgetExecutiveCards data={budget} />

          {/* Listagem Hierárquica */}
          <BudgetHierarchyList categories={budget.categories} onEditLimit={handleEdit} onAddNew={handleOpenNew} />

          {/* Modal de Limite Orçamentário */}
          <BudgetLimitDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            month={selectedMonth}
            freeBalance={budget.freeBalance}
            categories={budget.allExpenseCategories}
            editTarget={editTarget}
          />
        </div>
      )}
    </ClientDataLoader>
  );
}
