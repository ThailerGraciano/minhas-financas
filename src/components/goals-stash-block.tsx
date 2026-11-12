"use client";

import type { StashAccount } from "@/app/actions/dashboard";
import { cn } from "@/lib/utils";
import {
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  Car,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Home,
  Minus,
  PiggyBank,
  Plane,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

interface GoalsStashBlockProps {
  stashAccounts: StashAccount[];
  showBalance?: boolean;
}

type StashVisualTheme = {
  icon: React.ReactNode;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  barColor: string;
  categoryLabel: string;
};

function getStashTheme(name: string, type: string, index: number): StashVisualTheme {
  const lower = name.toLowerCase();

  if (lower.includes("reserva") || lower.includes("emergência") || lower.includes("emergencia")) {
    return {
      icon: <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />,
      accentColor: "#10b981",
      badgeBg: "bg-emerald-500/15",
      badgeText: "text-emerald-400",
      badgeBorder: "border-emerald-500/25",
      barColor: "#10b981",
      categoryLabel: "Segurança",
    };
  }

  if (
    lower.includes("carro") ||
    lower.includes("veículo") ||
    lower.includes("veiculo") ||
    lower.includes("auto") ||
    lower.includes("moto")
  ) {
    return {
      icon: <Car className="w-4.5 h-4.5 text-amber-400" />,
      accentColor: "#f59e0b",
      badgeBg: "bg-amber-500/15",
      badgeText: "text-amber-400",
      badgeBorder: "border-amber-500/25",
      barColor: "#f59e0b",
      categoryLabel: "Veículo",
    };
  }

  if (
    lower.includes("casa") ||
    lower.includes("imóvel") ||
    lower.includes("imovel") ||
    lower.includes("reforma") ||
    lower.includes("obra") ||
    lower.includes("apartamento")
  ) {
    return {
      icon: <Home className="w-4.5 h-4.5 text-sky-400" />,
      accentColor: "#38bdf8",
      badgeBg: "bg-sky-500/15",
      badgeText: "text-sky-400",
      badgeBorder: "border-sky-500/25",
      barColor: "#38bdf8",
      categoryLabel: "Moradia",
    };
  }

  if (lower.includes("viagem") || lower.includes("férias") || lower.includes("ferias")) {
    return {
      icon: <Plane className="w-4.5 h-4.5 text-violet-400" />,
      accentColor: "#8b5cf6",
      badgeBg: "bg-violet-500/15",
      badgeText: "text-violet-400",
      badgeBorder: "border-violet-500/25",
      barColor: "#8b5cf6",
      categoryLabel: "Viagem",
    };
  }

  if (
    lower.includes("estudo") ||
    lower.includes("faculdade") ||
    lower.includes("curso") ||
    lower.includes("educação")
  ) {
    return {
      icon: <GraduationCap className="w-4.5 h-4.5 text-indigo-400" />,
      accentColor: "#6366f1",
      badgeBg: "bg-indigo-500/15",
      badgeText: "text-indigo-400",
      badgeBorder: "border-indigo-500/25",
      barColor: "#6366f1",
      categoryLabel: "Educação",
    };
  }

  if (type === "savings") {
    return {
      icon: <PiggyBank className="w-4.5 h-4.5 text-blue-400" />,
      accentColor: "#3b82f6",
      badgeBg: "bg-blue-500/15",
      badgeText: "text-blue-400",
      badgeBorder: "border-blue-500/25",
      barColor: "#3b82f6",
      categoryLabel: "Poupança",
    };
  }

  const fallbackColors = ["#a855f7", "#ec4899", "#14b8a6", "#f97316"];
  const fallbackColor = fallbackColors[index % fallbackColors.length];

  return {
    icon: <Archive className="w-4.5 h-4.5 text-purple-400" />,
    accentColor: fallbackColor,
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-400",
    badgeBorder: "border-purple-500/25",
    barColor: fallbackColor,
    categoryLabel: "Caixinha",
  };
}

export function GoalsStashBlock({ stashAccounts, showBalance = true }: GoalsStashBlockProps) {
  const formatCurrency = React.useCallback(
    (value: number) => {
      if (!showBalance) return "••••••";
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    },
    [showBalance],
  );

  // Ordena priorizando maior saldo acumulado e destaque para Reserva, Carro e Casa
  const sortedAccounts = React.useMemo(() => {
    return [...stashAccounts].sort((a, b) => {
      const priorityScore = (acc: StashAccount) => {
        const lower = acc.name.toLowerCase();
        if (lower.includes("reserva")) return 3;
        if (lower.includes("carro")) return 2;
        if (lower.includes("casa")) return 1;
        return 0;
      };
      const diffPriority = priorityScore(b) - priorityScore(a);
      if (diffPriority !== 0) return diffPriority;
      return b.currentBalance - a.currentBalance;
    });
  }, [stashAccounts]);

  const summary = React.useMemo(() => {
    let totalSaved = 0;
    let totalMonthAporte = 0;
    let totalMonthVariation = 0;
    let totalTargetAmount = 0;
    let totalBalanceWithTarget = 0;
    let accountsWithTargetCount = 0;
    let completedGoalsCount = 0;

    sortedAccounts.forEach((acc) => {
      const bal = Math.max(0, Number(acc.currentBalance) || 0);
      totalSaved += bal;
      totalMonthAporte += Number(acc.monthAporte) || 0;
      totalMonthVariation += Number(acc.monthVariation) || 0;

      if (acc.targetAmount !== null && acc.targetAmount > 0) {
        accountsWithTargetCount += 1;
        totalTargetAmount += acc.targetAmount;
        totalBalanceWithTarget += Math.min(bal, acc.targetAmount);
        if (bal >= acc.targetAmount) {
          completedGoalsCount += 1;
        }
      }
    });

    const globalTargetProgress =
      totalTargetAmount > 0 ? Math.min(100, (totalBalanceWithTarget / totalTargetAmount) * 100) : 0;
    const totalRemainingToTargets = Math.max(0, totalTargetAmount - totalBalanceWithTarget);

    return {
      totalSaved,
      totalMonthAporte,
      totalMonthVariation,
      totalTargetAmount,
      accountsWithTargetCount,
      completedGoalsCount,
      globalTargetProgress,
      totalRemainingToTargets,
    };
  }, [sortedAccounts]);

  if (sortedAccounts.length === 0) {
    return null;
  }

  return (
    <div className="@container bg-card/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] px-3.5 py-5 sm:p-6 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] space-y-5 w-full min-w-0 relative overflow-hidden">
      {/* Specular top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Cabeçalho Mobile-First */}
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 text-primary flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Target className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-foreground leading-snug [text-wrap:balance]">
              Minhas Caixinhas
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 [text-wrap:pretty]">
              Metas, aportes mensais e evolução dos seus objetivos financeiros
            </p>
          </div>
        </div>

        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-1.5 rounded-xl transition-colors shrink-0"
        >
          <span>Gerenciar metas</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 1. Resumo Executivo Consolidado das Caixinhas */}
      <div className="grid grid-cols-2 @xl:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Card 1: Total Guardado */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate font-medium">Total Guardado</span>
            <PiggyBank className="w-3.5 h-3.5 text-primary shrink-0" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-extrabold text-foreground tabular-nums whitespace-nowrap">
              {formatCurrency(summary.totalSaved)}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
              {sortedAccounts.length} {sortedAccounts.length === 1 ? "caixinha" : "caixinhas"}
            </span>
          </div>
        </div>

        {/* Card 2: Aportes e Variação no Mês */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate font-medium">Aportes no Mês</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-extrabold text-emerald-400 tabular-nums whitespace-nowrap">
              +{formatCurrency(summary.totalMonthAporte)}
            </span>
            {Math.abs(summary.totalMonthVariation) > 0.01 && (
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0",
                  summary.totalMonthVariation >= 0
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-rose-500/15 text-rose-400",
                )}
              >
                Líq: {summary.totalMonthVariation > 0 ? "+" : ""}
                {formatCurrency(summary.totalMonthVariation)}
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Progresso Global das Metas */}
        <div className="col-span-2 @xl:col-span-1 rounded-2xl bg-primary/[0.08] border border-primary/20 p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-[11px] text-primary">
            <span className="truncate font-semibold">
              {summary.accountsWithTargetCount > 0
                ? "Progresso Global das Metas"
                : "Patrimônio em Caixinhas"}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          </div>
          {summary.accountsWithTargetCount > 0 ? (
            <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-extrabold text-foreground tabular-nums">
                {summary.globalTargetProgress.toFixed(0)}% concluído
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 tabular-nums">
                {summary.totalRemainingToTargets > 0
                  ? `Falta ${formatCurrency(summary.totalRemainingToTargets)}`
                  : `${summary.completedGoalsCount} meta(s) batida(s)!`}
              </span>
            </div>
          ) : (
            <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Defina valores-alvo em Contas para acompanhar o progresso
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Barra Visual de Distribuição entre as Caixinhas */}
      {summary.totalSaved > 0 && sortedAccounts.length > 1 && (
        <div className="rounded-2xl bg-black/20 border border-white/[0.06] p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-medium">Distribuição do saldo guardado</span>
            <span className="font-mono text-[10px]">100%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/[0.05] overflow-hidden flex gap-0.5 p-0.5">
            {sortedAccounts.map((acc, idx) => {
              const bal = Math.max(0, Number(acc.currentBalance) || 0);
              if (bal <= 0) return null;
              const share = (bal / summary.totalSaved) * 100;
              const theme = getStashTheme(acc.name, acc.type, idx);
              return (
                <div
                  key={acc.id}
                  title={`${acc.name}: ${share.toFixed(1)}%`}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
                  style={{
                    width: `${Math.max(3, share)}%`,
                    backgroundColor: theme.barColor,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Grade de Cards das Caixinhas (Sem corte de valores no mobile) */}
      <div className="grid grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-3 gap-3">
        {sortedAccounts.map((account, index) => {
          const theme = getStashTheme(account.name, account.type, index);
          const balance = Number(account.currentBalance) || 0;
          const shareOfTotal =
            summary.totalSaved > 0 && balance > 0 ? (balance / summary.totalSaved) * 100 : 0;

          const hasTarget = account.targetAmount !== null && account.targetAmount > 0;
          const targetAmount = hasTarget ? Number(account.targetAmount) : 0;
          const progressPercent = hasTarget
            ? Math.min(100, Math.max(0, Math.round((balance / targetAmount) * 100)))
            : 0;
          const isCompleted = hasTarget && balance >= targetAmount;
          const remainingToTarget = hasTarget ? Math.max(0, targetAmount - balance) : 0;

          // Estimativa de meses mantendo o aporte do mês atual
          const estimatedMonths =
            remainingToTarget > 0 && account.monthAporte > 0
              ? Math.ceil(remainingToTarget / account.monthAporte)
              : null;

          const isPositiveVar = account.monthVariation > 0.005;
          const isNegativeVar = account.monthVariation < -0.005;

          return (
            <div
              key={account.id}
              className="bg-card/85 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-white/20 hover:bg-card/95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_16px_rgba(0,0,0,0.3)] group min-w-0"
            >
              <div className="space-y-3 min-w-0">
                {/* Linha 1: Ícone + Nome da Caixinha */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
                        theme.badgeBg,
                        theme.badgeBorder,
                      )}
                    >
                      {theme.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-foreground truncate block group-hover:text-primary transition-colors">
                        {account.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {theme.categoryLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linha 2: Tags acima do valor (% do total + Status da Meta + Aporte) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center text-[10px] font-mono font-semibold text-muted-foreground bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 rounded-full tabular-nums">
                    {shareOfTotal.toFixed(0)}% do total
                  </span>

                  {hasTarget ? (
                    isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Meta atingida!
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border tabular-nums",
                          theme.badgeBg,
                          theme.badgeText,
                          theme.badgeBorder,
                        )}
                      >
                        {progressPercent}% da meta
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded-full">
                      Sem teto definido
                    </span>
                  )}

                  {account.monthAporte > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full tabular-nums">
                      +{formatCurrency(account.monthAporte)}
                    </span>
                  )}
                </div>

                {/* Linha 3: Saldo Atual esticado de ponta a ponta sem cortar */}
                <div className="rounded-xl bg-black/25 border border-white/[0.05] px-3 py-2.5 flex items-baseline justify-between gap-2 w-full">
                  <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                    Saldo atual
                  </span>
                  <span className="text-base sm:text-lg font-black text-foreground tracking-tight tabular-nums whitespace-nowrap">
                    {formatCurrency(balance)}
                  </span>
                </div>

                {/* Linha 4: Barra de Progresso e Meta (ou Participação) */}
                {hasTarget ? (
                  <div className="space-y-1.5">
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(4, progressPercent))}%`,
                          backgroundColor: isCompleted ? "#10b981" : theme.barColor,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] w-full">
                      <span className="text-muted-foreground shrink-0">Meta:</span>
                      <span className="font-semibold text-foreground tabular-nums whitespace-nowrap">
                        {formatCurrency(targetAmount)}
                      </span>
                    </div>

                    {!isCompleted && (
                      <div className="flex items-center justify-between gap-2 text-[11px] w-full">
                        <span className="text-muted-foreground shrink-0">Falta:</span>
                        <span className="font-semibold text-muted-foreground tabular-nums whitespace-nowrap">
                          {formatCurrency(remainingToTarget)}
                          {estimatedMonths !== null && estimatedMonths <= 120
                            ? ` (~${estimatedMonths}m)`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(4, shareOfTotal))}%`,
                          backgroundColor: theme.barColor,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>Participação no total</span>
                      <span className="font-mono font-semibold text-foreground tabular-nums">
                        {shareOfTotal.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Rodapé: Aporte e Variação Líquida no Mês */}
              <div className="pt-2.5 border-t border-white/[0.06] flex flex-col gap-1 text-[11px]">
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-muted-foreground shrink-0">Aporte no mês:</span>
                  <strong className="text-foreground tabular-nums whitespace-nowrap">
                    {formatCurrency(account.monthAporte)}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-muted-foreground shrink-0">Variação no mês:</span>
                  <span
                    className={cn(
                      "inline-flex items-center font-bold tabular-nums whitespace-nowrap",
                      isPositiveVar
                        ? "text-emerald-400"
                        : isNegativeVar
                          ? "text-rose-400"
                          : "text-muted-foreground",
                    )}
                  >
                    {isPositiveVar ? (
                      <ArrowUpRight className="w-3 h-3 mr-0.5 shrink-0" />
                    ) : isNegativeVar ? (
                      <ArrowDownRight className="w-3 h-3 mr-0.5 shrink-0" />
                    ) : (
                      <Minus className="w-3 h-3 mr-0.5 shrink-0" />
                    )}
                    {isPositiveVar ? "+" : ""}
                    {formatCurrency(account.monthVariation)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
