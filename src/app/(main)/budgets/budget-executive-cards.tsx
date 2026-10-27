"use client";

import type { PillarDistribution } from "@/app/actions/budgets";
import { Progress } from "@/components/ui/progress";
import type { BudgetPlannerSummary } from "@/lib/budget-planner-utils";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FolderOpen,
  Layers,
  PieChart,
  TrendingUp,
  Wallet,
} from "lucide-react";

interface BudgetExecutiveCardsProps {
  summary: BudgetPlannerSummary;
  incomeVariationPercent: number;
  pillars: PillarDistribution;
  selectedIncomesCount: number;
  totalAvailableIncomesCount: number;
}

export function BudgetExecutiveCards({
  summary,
  incomeVariationPercent,
  pillars,
  selectedIncomesCount,
  totalAvailableIncomesCount,
}: BudgetExecutiveCardsProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const {
    selectedIncomeTotal,
    totalBudgetedExpenses,
    projectedBalance,
    totalDistributed,
    totalUndistributed,
    distributedPercent,
    hasOverBudgetWarning,
  } = summary;

  const committedPercent =
    selectedIncomeTotal > 0 ? (totalBudgetedExpenses / selectedIncomeTotal) * 100 : 0;
  const isBalancePositive = projectedBalance >= -0.005;

  return (
    <div className="space-y-4">
      {/* 5 Indicadores Resumidos (Seção 4.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Receita Prevista */}
        <div className="bg-[#1A1A22] rounded-2xl p-4 sm:p-5 border border-white/5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Receita Prevista
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
              {selectedIncomesCount}/{totalAvailableIncomesCount} selecionadas
            </span>
          </div>

          <div className="my-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight tabular-nums truncate">
              {formatCurrency(selectedIncomeTotal)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {incomeVariationPercent >= 0
                ? `↑ +${incomeVariationPercent.toFixed(1)}%`
                : `↓ ${incomeVariationPercent.toFixed(1)}%`}{" "}
              vs mês anterior
            </span>
          </div>
        </div>

        {/* 2. Despesas Orçadas */}
        <div className="bg-[#1A1A22] rounded-2xl p-4 sm:p-5 border border-white/5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Despesas Orçadas
            </span>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 shrink-0">
              {committedPercent.toFixed(1)}% da receita
            </span>
          </div>

          <div className="my-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 text-primary flex items-center justify-center shrink-0">
              <PieChart className="w-4 h-4" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight tabular-nums truncate">
              {formatCurrency(totalBudgetedExpenses)}
            </span>
          </div>

          <div className="w-full space-y-1">
            <Progress
              value={Math.min(100, Math.max(0, committedPercent))}
              className="h-1.5 bg-muted/30 [&>div]:bg-primary"
            />
          </div>
        </div>

        {/* 3. Saldo Previsto */}
        <div className="bg-[#1A1A22] rounded-2xl p-4 sm:p-5 border border-white/5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Saldo Previsto
            </span>
            {Math.abs(projectedBalance) < 0.01 && totalBudgetedExpenses > 0 ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20 shrink-0">
                <CheckCircle2 className="w-3 h-3" /> Base Zero
              </span>
            ) : hasOverBudgetWarning ? (
              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-3 h-3" /> Acima da Receita
              </span>
            ) : (
              <span className="text-[10px] font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full border border-white/5 shrink-0">
                Livre no Mês
              </span>
            )}
          </div>

          <div className="my-2.5 flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isBalancePositive
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-rose-500/10 text-rose-500"
              }`}
            >
              <Wallet className="w-4 h-4" />
            </div>
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums truncate ${
                isBalancePositive ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {formatCurrency(projectedBalance)}
            </span>
          </div>

          <div className="text-[11px] text-muted-foreground truncate">
            {isBalancePositive
              ? "Receita prevista menos todas as despesas"
              : "Orçamento supera as receitas selecionadas"}
          </div>
        </div>

        {/* 4. Total Distribuído */}
        <div className="bg-[#1A1A22] rounded-2xl p-4 sm:p-5 border border-white/5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Distribuído
            </span>
            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 shrink-0">
              {distributedPercent.toFixed(0)}% vinculado
            </span>
          </div>

          <div className="my-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight tabular-nums truncate">
              {formatCurrency(totalDistributed)}
            </span>
          </div>

          <div className="w-full space-y-1">
            <Progress
              value={Math.min(100, Math.max(0, distributedPercent))}
              className="h-1.5 bg-muted/30 [&>div]:bg-blue-500"
            />
          </div>
        </div>

        {/* 5. Total Sem Distribuição */}
        <div className="bg-[#1A1A22] rounded-2xl p-4 sm:p-5 border border-white/5 shadow-sm flex flex-col justify-between relative overflow-hidden sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Sem Distribuição
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                totalUndistributed > 0.005
                  ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                  : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              }`}
            >
              {summary.unallocatedItems.length}{" "}
              {summary.unallocatedItems.length === 1 ? "item" : "itens"}
            </span>
          </div>

          <div className="my-2.5 flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                totalUndistributed > 0.005
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-emerald-500/10 text-emerald-400"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight tabular-nums truncate">
              {formatCurrency(totalUndistributed)}
            </span>
          </div>

          <div className="text-[11px] text-muted-foreground truncate">
            {totalUndistributed > 0.005
              ? "Arraste para uma receita no mapa abaixo"
              : "Todas as despesas foram distribuídas"}
          </div>
        </div>
      </div>

      {/* Barra de Distribuição por Pilar (Stacked Progress Bar) */}
      <div className="bg-[#1A1A22] rounded-2xl sm:rounded-3xl p-5 border border-white/5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Distribuição do Orçamento por Pilar
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visualização percentual das metas do Orçamento Base Zero
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground tabular-nums">
            Total Base: {formatCurrency(Math.max(selectedIncomeTotal, totalBudgetedExpenses))}
          </span>
        </div>

        {/* Segmented Stacked Progress Bar */}
        <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden flex shadow-inner">
          {pillars.needsPercent > 0 && (
            <div
              style={{ width: `${pillars.needsPercent}%` }}
              className="bg-orange-500 h-full transition-all duration-300 relative group"
              title={`Necessidades Fixas: ${pillars.needsPercent.toFixed(1)}%`}
            />
          )}
          {pillars.lifestylePercent > 0 && (
            <div
              style={{ width: `${pillars.lifestylePercent}%` }}
              className="bg-amber-500 h-full transition-all duration-300 relative group"
              title={`Estilo de Vida: ${pillars.lifestylePercent.toFixed(1)}%`}
            />
          )}
          {pillars.goalsPercent > 0 && (
            <div
              style={{ width: `${pillars.goalsPercent}%` }}
              className="bg-emerald-500 h-full transition-all duration-300 relative group"
              title={`Metas & Aportes: ${pillars.goalsPercent.toFixed(1)}%`}
            />
          )}
          {pillars.freePercent > 0 && (
            <div
              style={{ width: `${pillars.freePercent}%` }}
              className="bg-blue-500 h-full transition-all duration-300 relative group"
              title={`Saldo Livre: ${pillars.freePercent.toFixed(1)}%`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-muted-foreground truncate">
                Necessidades Fixas
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {formatCurrency(pillars.needsAmount)}{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({pillars.needsPercent.toFixed(0)}%)
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-muted-foreground truncate">
                Estilo de Vida
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {formatCurrency(pillars.lifestyleAmount)}{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({pillars.lifestylePercent.toFixed(0)}%)
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-muted-foreground truncate">
                Metas & Aportes
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {formatCurrency(pillars.goalsAmount)}{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({pillars.goalsPercent.toFixed(0)}%)
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-muted-foreground truncate">
                Saldo Livre
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {formatCurrency(pillars.freeAmount)}{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({pillars.freePercent.toFixed(0)}%)
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
