"use client";

import type { StashAccount } from "@/app/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Archive, ArrowDownRight, ArrowUpRight, Car, Home, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";

interface GoalsStashBlockProps {
  stashAccounts: StashAccount[];
  showBalance?: boolean;
}

export function GoalsStashBlock({ stashAccounts, showBalance = true }: GoalsStashBlockProps) {
  const formatCurrency = (value: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getAccountIcon = (name: string, type: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("carro") || lower.includes("veículo") || lower.includes("auto")) {
      return <Car className="w-5 h-5 text-amber-400" />;
    }
    if (lower.includes("casa") || lower.includes("imóvel") || lower.includes("reforma")) {
      return <Home className="w-5 h-5 text-emerald-400" />;
    }
    if (lower.includes("reserva") || type === "savings") {
      return <ShieldCheck className="w-5 h-5 text-blue-400" />;
    }
    return <Archive className="w-5 h-5 text-purple-400" />;
  };

  // Ordena dando destaque especial para Reserva, Carro e Casa
  const sortedAccounts = [...stashAccounts].sort((a, b) => {
    const score = (acc: StashAccount) => {
      const lower = acc.name.toLowerCase();
      if (lower.includes("reserva")) return 3;
      if (lower.includes("carro")) return 2;
      if (lower.includes("casa")) return 1;
      return 0;
    };
    return score(b) - score(a);
  });

  if (sortedAccounts.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 border border-white/5 shadow-sm space-y-4 w-full min-w-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Minhas Caixinhas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Metas, aportes e evolução dos seus objetivos</p>
          </div>
        </div>

        <Link href="/accounts" className="text-xs text-primary font-medium hover:underline">
          Gerenciar metas
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
        {sortedAccounts.map((account) => {
          const isPositiveVar = account.monthVariation >= 0;
          const hasTarget = account.targetAmount !== null && account.targetAmount > 0;
          const progressPercent = hasTarget
            ? Math.min(100, Math.round((account.currentBalance / account.targetAmount!) * 100))
            : 0;

          return (
            <div
              key={account.id}
              className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-white/10 transition-all shadow-sm group"
            >
              <div>
                {/* Cabeçalho do Card */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-background/80 border border-white/5 flex items-center justify-center shrink-0">
                      {getAccountIcon(account.name, account.type)}
                    </div>
                    <span className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {account.name}
                    </span>
                  </div>

                  {account.monthAporte > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shrink-0"
                    >
                      +{formatCurrency(account.monthAporte)}
                    </Badge>
                  )}
                </div>

                {/* Saldo Atual */}
                <div className="space-y-0.5 mb-3">
                  <span className="text-[11px] text-muted-foreground block font-medium">Saldo atual</span>
                  <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    {formatCurrency(account.currentBalance)}
                  </div>
                </div>

                {/* Meta de Progresso se configurada */}
                {hasTarget && (
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                      <span>Progresso</span>
                      <span>
                        {progressPercent}% de {formatCurrency(account.targetAmount!)}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-1 bg-white/5 [&>div]:bg-primary" />
                  </div>
                )}
              </div>

              {/* Rodapé: Aporte e Variação no Mês */}
              <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">
                  Aporte: <strong className="text-foreground">{formatCurrency(account.monthAporte)}</strong>
                </span>

                <span
                  className={cn(
                    "flex items-center font-semibold text-[11px]",
                    isPositiveVar ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {isPositiveVar ? (
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-0.5" />
                  )}
                  {isPositiveVar ? "+" : ""}
                  {formatCurrency(account.monthVariation)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
