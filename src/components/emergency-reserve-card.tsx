"use client";

import type { ReserveData, ReserveSparklinePoint } from "@/app/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from "recharts";

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
      <div className="bg-card/70 backdrop-blur-xl rounded-[2rem] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] p-5 sm:p-6 flex flex-col justify-center items-center text-center min-h-[300px]">
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
    <div className="bg-card/70 backdrop-blur-xl rounded-[2rem] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden h-full">
      {/* Specular top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
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
            className="px-2.5 py-0.5 text-xs font-semibold rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 whitespace-nowrap"
          >
            {coverageMonths.toFixed(1)} meses
          </Badge>
        )}
      </div>

      {/* Saldo Atual & Crescimento */}
      <div className="space-y-1 relative z-10 mb-4">
        <span className="text-xs font-medium text-muted-foreground">Reserva Atual</span>
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div className="text-2xl sm:text-3xl lg:text-2xl xl:text-3xl font-black text-foreground tracking-tight whitespace-nowrap">
            {formatCurrency(currentBalance)}
          </div>

          <div
            className={cn(
              "flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap",
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
        <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col min-w-0">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
            Aporte Fixo
          </span>
          <span className="text-xs sm:text-sm font-bold text-foreground mt-1 tabular-nums whitespace-nowrap">
            {formatCurrency(fixedAporte)}
          </span>
        </div>
        <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col min-w-0">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
            Aporte Variável
          </span>
          <span className="text-xs sm:text-sm font-bold text-foreground mt-1 tabular-nums whitespace-nowrap">
            {formatCurrency(variableAporte)}
          </span>
        </div>
        <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col min-w-0">
          <span className="text-[10px] font-medium text-blue-300 uppercase tracking-wider truncate">Aporte Total</span>
          <span className="text-xs sm:text-sm font-bold text-blue-400 mt-1 tabular-nums whitespace-nowrap">
            {formatCurrency(monthAporte)}
          </span>
        </div>
      </div>

      {/* Mini Area Chart / Sparkline: 3 meses passados + Hoje (meio) + 3 meses futuros */}
      {sparkline.length > 0 && (
        <div className="pt-2.5 border-t border-white/5 relative z-10 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>Evolução da Reserva</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-blue-400">
                <span className="inline-block w-3 h-0.5 bg-blue-500 rounded-full" />
                Histórico
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="inline-block w-3.5 border-t-2 border-dotted border-emerald-400" />
                Projeção (+3m)
              </span>
            </div>
          </div>
          <div className="h-16 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 64 }}>
              <AreaChart data={sparkline} margin={{ top: 6, right: 6, left: 6, bottom: 2 }}>
                <defs>
                  <linearGradient id="reserveSparkPast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="reserveSparkFuture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" hide />
                {sparkline.find((p) => p.isCurrent) && (
                  <ReferenceLine
                    x={sparkline.find((p) => p.isCurrent)?.month}
                    stroke="rgba(255,255,255,0.2)"
                    strokeDasharray="2 2"
                    strokeWidth={1}
                  />
                )}
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ReserveSparklinePoint;
                      return (
                        <div className="bg-popover border border-white/10 text-popover-foreground text-[11px] rounded-xl px-2.5 py-1.5 shadow-lg space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold">{data.month}</span>
                            <span
                              className={cn(
                                "text-[9px] font-semibold px-1.5 py-0.2 rounded-full",
                                data.isFuture
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : data.isCurrent
                                    ? "bg-blue-500/20 text-blue-300"
                                    : "bg-white/10 text-muted-foreground",
                              )}
                            >
                              {data.isFuture ? "Projeção" : data.isCurrent ? "Hoje" : "Real"}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "font-bold text-xs",
                              data.isFuture ? "text-emerald-400" : "text-foreground",
                            )}
                          >
                            {formatCurrency(data.balance)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="balancePast"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#reserveSparkPast)"
                  dot={false}
                  activeDot={{ r: 3.5, fill: "#3b82f6", stroke: "var(--background)", strokeWidth: 1.5 }}
                  connectNulls
                />
                <Area
                  type="monotone"
                  dataKey="balanceFuture"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  strokeDasharray="3 3"
                  fill="url(#reserveSparkFuture)"
                  dot={{ r: 2.5, fill: "#10b981", strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: "#10b981", stroke: "var(--background)", strokeWidth: 1.5 }}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center text-[10px] px-1">
            {sparkline.map((item, idx) => (
              <span
                key={idx}
                className={cn(
                  "transition-colors",
                  item.isCurrent
                    ? "font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-md"
                    : item.isFuture
                      ? "font-semibold text-emerald-400/90"
                      : "text-muted-foreground",
                )}
              >
                {item.month}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
