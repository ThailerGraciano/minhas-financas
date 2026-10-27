"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { BudgetIncomeSource, BudgetPlanItem } from "@/lib/budget-planner-utils";
import { roundCurrency } from "@/lib/budget-planner-utils";
import { cn } from "@/lib/utils";
import {
  Banknote,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useState } from "react";

interface BudgetIncomeSelectorProps {
  availableIncomes: BudgetIncomeSource[];
  selectedIncomeIds: string[];
  items: BudgetPlanItem[];
  onToggleIncome: (incomeId: string) => void;
  onSelectAll: () => void;
}

export function BudgetIncomeSelector({
  availableIncomes,
  selectedIncomeIds,
  items,
  onToggleIncome,
  onSelectAll,
}: BudgetIncomeSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const selectedSet = new Set(selectedIncomeIds);
  const selectedTotal = roundCurrency(
    availableIncomes
      .filter((inc) => selectedSet.has(inc.id))
      .reduce((acc, inc) => acc + inc.amount, 0),
  );

  if (availableIncomes.length === 0) {
    return (
      <div className="bg-[#1A1A22] rounded-2xl sm:rounded-3xl p-5 border border-white/5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Nenhuma receita fixa ou prevista cadastrada neste mês
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cadastre uma receita fixa (ex: Salário, Adiantamento) pelo botão global de Nova
              Transação para distribuir suas despesas nos contêineres de receita.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A22] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Receitas do Mês Selecionadas
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {selectedIncomeIds.length} de {availableIncomes.length} ativas
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecione as receitas fixas que formarão os blocos principais de distribuição deste mês
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 tabular-nums">
            Total: {formatCurrency(selectedTotal)}
          </span>
          {selectedIncomeIds.length < availableIncomes.length && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              className="h-8 text-xs rounded-xl border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer"
            >
              Selecionar todas
            </Button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
            title={isExpanded ? "Recolher seleção de receitas" : "Expandir seleção de receitas"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {availableIncomes.map((inc) => {
            const isSelected = selectedSet.has(inc.id);
            const allocatedAmount = roundCurrency(
              items
                .filter((item) => item.incomeSourceId === inc.id)
                .reduce((acc, item) => acc + item.amount, 0),
            );
            const committedPercent =
              inc.amount > 0 ? Math.min(100, (allocatedAmount / inc.amount) * 100) : 0;
            const remaining = roundCurrency(Math.max(0, inc.amount - allocatedAmount));

            return (
              <button
                key={inc.id}
                type="button"
                onClick={() => onToggleIncome(inc.id)}
                className={cn(
                  "text-left rounded-2xl p-3.5 border transition-all duration-150 cursor-pointer flex flex-col justify-between gap-2.5",
                  isSelected
                    ? "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50 shadow-sm"
                    : "bg-black/20 border-white/5 opacity-60 hover:opacity-90 hover:border-white/15",
                )}
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors",
                        isSelected
                          ? "bg-emerald-500 border-emerald-500 text-black"
                          : "border-white/20 bg-white/5 text-transparent",
                      )}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-foreground block truncate">
                        {inc.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                        <span>{inc.categoryName}</span>
                        {inc.accountName && (
                          <>
                            <span>•</span>
                            <span className="truncate">{inc.accountName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span className="font-black text-xs sm:text-sm text-emerald-400 tabular-nums">
                      {formatCurrency(inc.amount)}
                    </span>
                    {inc.isFixed && (
                      <span className="text-[9px] font-semibold text-emerald-300/80 bg-emerald-500/10 px-1.5 py-0.2 rounded flex items-center gap-0.5 mt-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Fixa
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="space-y-1 w-full pt-1 border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
                      <span>
                        Alocado: <strong className="text-foreground">{formatCurrency(allocatedAmount)}</strong> ({committedPercent.toFixed(0)}%)
                      </span>
                      <span>
                        Livre: <strong className="text-emerald-400">{formatCurrency(remaining)}</strong>
                      </span>
                    </div>
                    <Progress
                      value={committedPercent}
                      className="h-1 bg-white/5 [&>div]:bg-emerald-500"
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

