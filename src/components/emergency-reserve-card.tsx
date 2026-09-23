"use client";

import type { ReserveData } from "@/app/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

interface EmergencyReserveCardProps {
  reserveData: ReserveData | null;
  showBalance?: boolean;
}

export function EmergencyReserveCard({ reserveData, showBalance = true }: EmergencyReserveCardProps) {
  const formatCurrency = (value: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (!reserveData) {
    return (
      <div className="bg-card rounded-[2rem] border border-white/5 shadow-sm p-5 sm:p-6 flex flex-col justify-center items-center text-center min-h-[300px]">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Reserva de Emergência</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
          Nenhuma conta identificada como reserva (tipo Poupança ou nome &quot;Reserva&quot;).
        </p>
      </div>
    );
  }

  const {
    currentBalance,
    monthAporte,
    fixedAporte,
    variableAporte,
    growthAmount,
    growthPercentage,
    coverageMonths,
    targetAmount,
    sparkline,
  } = reserveData;

  const isPositiveGrowth = growthAmount >= 0;

  return (
    <div className="bg-card rounded-[2rem] border border-white/5 shadow-sm p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
      {/* Background glow sutil */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Reserva de Emergência</h2>
            <p className="text-xs text-muted-foreground">{reserveData.accountName}</p>
          </div>
        </div>

        {coverageMonths !== null && coverageMonths > 0 && (
          <Badge
            variant="outline"
            className="px-2.5 py-0.5 text-xs font-semibold rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400"
          >
            {coverageMonths.toFixed(1)} meses
          </Badge>
        )}
      </div>

      {/* Saldo Atual & Crescimento */}
      <div className="space-y-1 relative z-10 mb-4">
        <span className="text-xs font-medium text-muted-foreground">Reserva Atual</span>
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            {formatCurrency(currentBalance)}
          </div>

          <div
            className={cn(
              "flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border",
              isPositiveGrowth
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20",
            )}
          >
            {isPositiveGrowth ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : null}
            {isPositiveGrowth ? "+" : ""}
            {formatCurrency(growthAmount)} ({growthPercentage.toFixed(1)}%)
          </div>
        </div>

        {/* Cobertura de Despesas Essenciais */}
        {coverageMonths !== null && (
          <p className="text-xs text-muted-foreground mt-1">
            Equivale a <span className="font-semibold text-foreground">{coverageMonths.toFixed(1)} meses</span> de
            despesas essenciais
          </p>
        )}
      </div>

      {/* Meta se configurada no sistema */}
      {targetAmount !== null && targetAmount > 0 && (
        <div className="space-y-1.5 relative z-10 mb-4 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Meta de Reserva</span>
            <span className="text-foreground font-semibold">
              {Math.min(100, Math.round((currentBalance / targetAmount) * 100))}% de {formatCurrency(targetAmount)}
            </span>
          </div>
          <Progress
            value={Math.min(100, (currentBalance / targetAmount) * 100)}
            className="h-1.5 bg-white/5 [&>div]:bg-blue-500"
          />
        </div>
      )}

      {/* Separação Visual de Aportes: Fixo (R$ 250) + Variável + Total */}
      <div className="grid grid-cols-3 gap-2 relative z-10 mb-4 text-center">
        <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Aporte Fixo</span>
          <span className="text-xs sm:text-sm font-bold text-foreground mt-1">{formatCurrency(fixedAporte)}</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Aporte Variável
          </span>
          <span className="text-xs sm:text-sm font-bold text-foreground mt-1">{formatCurrency(variableAporte)}</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col">
          <span className="text-[10px] font-medium text-blue-300 uppercase tracking-wider">Aporte Total</span>
          <span className="text-xs sm:text-sm font-bold text-blue-400 mt-1">{formatCurrency(monthAporte)}</span>
        </div>
      </div>

      {/* Mini Area Chart / Sparkline dos Últimos Meses */}
      {sparkline.length > 0 && (
        <div className="pt-2 border-t border-white/5 relative z-10 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>Evolução da Reserva</span>
            <span>Últimos 6 meses</span>
          </div>
          <div className="h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="reserveSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as { month: string; balance: number };
                      return (
                        <div className="bg-popover border border-white/10 text-popover-foreground text-[11px] rounded-lg px-2 py-1 shadow-md">
                          <span className="font-semibold">{data.month}: </span>
                          <span>{formatCurrency(data.balance)}</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#reserveSpark)"
                  dot={false}
                  activeDot={{ r: 3, fill: "#3b82f6" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground px-1">
            {sparkline.map((item, idx) => (
              <span key={idx}>{item.month}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
