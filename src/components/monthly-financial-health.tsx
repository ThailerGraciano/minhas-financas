"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

interface MonthlyFinancialHealthProps {
  totalIncome: number;
  totalExpense: number;
  expenseBreakdown?: {
    fixed: number;
    variable: number;
    installment: number;
  };
  showBalance?: boolean;
}

export function MonthlyFinancialHealth({
  totalIncome,
  totalExpense,
  expenseBreakdown = { fixed: 0, variable: 0, installment: 0 },
  showBalance = true,
}: MonthlyFinancialHealthProps) {
  const formatCurrency = (value: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const netResult = totalIncome - totalExpense;
  const committedPercent = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : totalExpense > 0 ? 100 : 0;
  const marginAmount = totalIncome - totalExpense;

  // Determinação da situação baseada puramente nos dados reais
  let status: "POSITIVO" | "ATENÇÃO" | "NEGATIVO" = "POSITIVO";
  let statusBadgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  let statusIcon = <CheckCircle2 className="w-3.5 h-3.5 mr-1" />;

  if (netResult < 0) {
    status = "NEGATIVO";
    statusBadgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
    statusIcon = <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
  } else if (committedPercent >= 85 || (totalIncome > 0 && netResult < totalIncome * 0.1)) {
    status = "ATENÇÃO";
    statusBadgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    statusIcon = <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
  }

  // Mensagem contextual baseada SOMENTE nos dados existentes
  let contextualMessage = "";
  if (status === "NEGATIVO") {
    contextualMessage = showBalance
      ? `Suas despesas superam as receitas em ${formatCurrency(Math.abs(netResult))}. Comprometimento de ${committedPercent.toFixed(1)}% das receitas.`
      : `Suas despesas superam as receitas neste mês. Comprometimento de ${committedPercent.toFixed(1)}% das receitas.`;
  } else if (status === "ATENÇÃO") {
    contextualMessage = showBalance
      ? `Suas despesas já comprometem ${committedPercent.toFixed(1)}% das receitas. Você possui ${formatCurrency(marginAmount)} de margem disponível.`
      : `Suas despesas já comprometem ${committedPercent.toFixed(1)}% das receitas com margem reduzida.`;
  } else {
    contextualMessage = showBalance
      ? `Seu mês está positivo em ${formatCurrency(netResult)}. Você possui ${formatCurrency(marginAmount)} de margem após as despesas (${committedPercent.toFixed(1)}% comprometido).`
      : `Seu mês está positivo com despesas sob controle (${committedPercent.toFixed(1)}% comprometido).`;
  }

  // Cálculos de comprometimento por tipo
  const fixedPercent = totalIncome > 0 ? (expenseBreakdown.fixed / totalIncome) * 100 : 0;
  const variablePercent = totalIncome > 0 ? (expenseBreakdown.variable / totalIncome) * 100 : 0;
  const installmentPercent = totalIncome > 0 ? (expenseBreakdown.installment / totalIncome) * 100 : 0;
  const marginPercent = Math.max(0, 100 - committedPercent);

  // Regra de Sobra (Section 21)
  const distributableSurplus = Math.max(0, netResult);

  return (
    <div className="bg-card rounded-[2rem] border border-white/5 shadow-sm p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
      {/* Background glow sutil */}
      <div
        className={cn(
          "absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20",
          status === "POSITIVO" ? "bg-emerald-500" : status === "ATENÇÃO" ? "bg-amber-500" : "bg-rose-500",
        )}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between relative z-10 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Saúde do Mês</h2>
            <p className="text-xs text-muted-foreground">Indicadores e capacidade de caixa</p>
          </div>
        </div>

        <Badge
          variant="outline"
          className={cn("px-2.5 py-0.5 text-xs font-semibold rounded-full border", statusBadgeClass)}
        >
          {statusIcon}
          {status}
        </Badge>
      </div>

      {/* Valor Principal: Resultado Líquido */}
      <div className="space-y-1 relative z-10 mb-4">
        <span className="text-xs font-medium text-muted-foreground">Resultado Líquido</span>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-3xl sm:text-4xl font-black tracking-tight",
              netResult > 0 ? "text-emerald-400" : netResult < 0 ? "text-rose-400" : "text-foreground",
            )}
          >
            {showBalance ? (
              <>
                {netResult > 0 ? "+" : ""}
                {formatCurrency(netResult)}
              </>
            ) : (
              "••••••"
            )}
          </span>
          {showBalance && (
            <span className="text-xs text-muted-foreground font-medium">
              {netResult >= 0 ? "livre após despesas" : "déficit no período"}
            </span>
          )}
        </div>
      </div>

      {/* Grid de 4 Métricas Chave */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative z-10 mb-4">
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
          <span className="text-[11px] font-medium text-muted-foreground">Receitas</span>
          <span className="text-sm sm:text-base font-bold text-emerald-400 mt-1 truncate">
            {formatCurrency(totalIncome)}
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
          <span className="text-[11px] font-medium text-muted-foreground">Despesas</span>
          <span className="text-sm sm:text-base font-bold text-rose-400 mt-1 truncate">
            {formatCurrency(totalExpense)}
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
          <span className="text-[11px] font-medium text-muted-foreground">Comprometido</span>
          <span
            className={cn(
              "text-sm sm:text-base font-bold mt-1",
              committedPercent > 90 ? "text-rose-400" : committedPercent > 75 ? "text-amber-400" : "text-foreground",
            )}
          >
            {committedPercent.toFixed(1)}%
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
          <span className="text-[11px] font-medium text-muted-foreground">Margem</span>
          <span
            className={cn(
              "text-sm sm:text-base font-bold mt-1 truncate",
              marginAmount >= 0 ? "text-primary" : "text-rose-400",
            )}
          >
            {formatCurrency(marginAmount)}
          </span>
        </div>
      </div>

      {/* Visualização Gráfica Horizontal de Consumo */}
      <div className="space-y-1.5 relative z-10 mb-4">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-muted-foreground">Consumo da Renda</span>
          <span className="text-foreground font-semibold">{committedPercent.toFixed(1)}% consumido</span>
        </div>
        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex p-0.5 border border-white/5">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              committedPercent > 95 ? "bg-rose-500" : committedPercent > 80 ? "bg-amber-500" : "bg-emerald-500",
            )}
            style={{ width: `${Math.min(100, Math.max(0, committedPercent))}%` }}
          />
        </div>
      </div>

      {/* Mensagem Contextual Baseada em Dados Reais */}
      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-muted-foreground leading-relaxed relative z-10 mb-4">
        {contextualMessage}
      </div>

      {/* Bloco: Comprometimento da Renda (Fixas | Variáveis | Parceladas | Margem) */}
      <div className="border-t border-white/5 pt-3.5 relative z-10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Comprometimento da Renda</span>
          <span className="text-[10px] text-muted-foreground">Base: 100% da Receita</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-muted-foreground block">Fixas</span>
            <span className="font-bold text-[#eab308] mt-0.5 block">{fixedPercent.toFixed(1)}%</span>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-muted-foreground block">Variáveis</span>
            <span className="font-bold text-[#22c55e] mt-0.5 block">{variablePercent.toFixed(1)}%</span>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-muted-foreground block">Parcelas</span>
            <span className="font-bold text-[#3b82f6] mt-0.5 block">{installmentPercent.toFixed(1)}%</span>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-muted-foreground block">Margem</span>
            <span className="font-bold text-primary mt-0.5 block">{marginPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Sobra para Distribuição (Regra de Sobra) */}
      <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between text-xs relative z-10">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Sobra para distribuição:
        </span>
        <span className="font-bold text-foreground tabular-nums">{formatCurrency(distributableSurplus)}</span>
      </div>
    </div>
  );
}
