"use client";

import type { BudgetData } from "@/app/actions/budgets";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, CheckCircle2, PieChart, TrendingUp, Wallet } from "lucide-react";

interface BudgetExecutiveCardsProps {
  data: BudgetData;
}

export function BudgetExecutiveCards({ data }: BudgetExecutiveCardsProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const { projectedIncome, incomeVariationPercent, committedBudget, committedPercent, freeBalance, pillars } = data;

  const isFreePositive = freeBalance >= 0;

  return (
    <div className="space-y-6">
      {/* 3 Executive Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Receitas Projetadas */}
        <div className="bg-[#1A1A22] rounded-2xl sm:rounded-3xl p-5 border border-white/5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Receitas Projetadas
            </span>
            <span className="text-[10px] font-bold text-muted-foreground bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
              Média Histórica
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {formatCurrency(projectedIncome)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>
              {incomeVariationPercent >= 0
                ? `↑ +${incomeVariationPercent.toFixed(1)}%`
                : `↓ ${incomeVariationPercent.toFixed(1)}%`}{" "}
              vs mês anterior
            </span>
          </div>
        </div>

        {/* 2. Orçamento Comprometido */}
        <div className="bg-[#1A1A22] rounded-2xl sm:rounded-3xl p-5 border border-white/5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Orçamento Comprometido
            </span>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              {committedPercent.toFixed(1)}% alocado
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 text-primary flex items-center justify-center shrink-0">
                <PieChart className="w-4 h-4" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {formatCurrency(committedBudget)}
              </span>
            </div>
          </div>

          <div className="w-full space-y-1">
            <Progress
              value={Math.min(100, Math.max(0, committedPercent))}
              className="h-1.5 bg-muted/30 [&>div]:bg-primary"
            />
          </div>
        </div>

        {/* 3. Saldo Livre */}
        <div className="bg-[#1A1A22] rounded-2xl sm:rounded-3xl p-5 border border-white/5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Saldo Livre (ZBB)
            </span>
            {freeBalance === 0 ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> 100% Alocado
              </span>
            ) : (
              <span className="text-[10px] font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                Para Distribuir
              </span>
            )}
          </div>

          <div className="my-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isFreePositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                }`}
              >
                <Wallet className="w-4 h-4" />
              </div>
              <span
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isFreePositive ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {formatCurrency(freeBalance)}
              </span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {isFreePositive
              ? "Disponível para alocar em novas metas ou reservas"
              : "Atenção: o orçamento supera as receitas projetadas"}
          </div>
        </div>
      </div>

      {/* Barra de Distribuição por Pilar (Stacked Progress Bar) */}
      <div className="bg-[#1A1A22] rounded-2xl sm:rounded-3xl p-5 border border-white/5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Distribuição do Orçamento por Pilar</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visualização percentual das metas do Orçamento Base Zero
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            Total Base: {formatCurrency(Math.max(projectedIncome, committedBudget))}
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
          {/* Necessidades Fixas (Laranja) */}
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-muted-foreground truncate">Necessidades Fixas</span>
              <span className="text-xs font-bold text-foreground">
                {formatCurrency(pillars.needsAmount)}{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({pillars.needsPercent.toFixed(0)}%)
                </span>
              </span>
            </div>
          </div>

          {/* Estilo de Vida (Amarelo) */}
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-muted-foreground truncate">Estilo de Vida</span>
              <span className="text-xs font-bold text-foreground">
                {formatCurrency(pillars.lifestyleAmount)}{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({pillars.lifestylePercent.toFixed(0)}%)
                </span>
              </span>
            </div>
          </div>

          {/* Metas & Aportes (Verde) */}
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-muted-foreground truncate">Metas & Aportes</span>
              <span className="text-xs font-bold text-foreground">
                {formatCurrency(pillars.goalsAmount)}{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({pillars.goalsPercent.toFixed(0)}%)
                </span>
              </span>
            </div>
          </div>

          {/* Saldo Livre (Azul) */}
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-muted-foreground truncate">Saldo Livre</span>
              <span className="text-xs font-bold text-foreground">
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
