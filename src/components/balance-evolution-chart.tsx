"use client";

import type { BalanceEvolutionPoint } from "@/app/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";

interface BalanceEvolutionChartProps {
  data: BalanceEvolutionPoint[];
  showBalance?: boolean;
}

const COLOR_PAST = "var(--primary)";
const COLOR_FUTURE = "#3b82f6";

const chartConfig = {
  balancePast: {
    label: "Saldo Real",
    color: COLOR_PAST,
  },
  balanceFuture: {
    label: "Projeção",
    color: COLOR_FUTURE,
  },
} satisfies ChartConfig;

export function BalanceEvolutionChart({ data, showBalance = true }: BalanceEvolutionChartProps) {
  const formatCurrency = (value: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCompact = (value: number) => {
    if (!showBalance) return "••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  // Encontra o último saldo real e o saldo final projetado
  const lastRealPoint = useMemo(() => {
    return [...data].reverse().find((d) => !d.isFuture && d.balancePast !== null);
  }, [data]);

  const lastProjectedPoint = useMemo(() => {
    return [...data].reverse().find((d) => d.isFuture && d.balanceFuture !== null);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
        Nenhuma conta cadastrada para exibir o gráfico.
      </div>
    );
  }

  // Y-axis domain com padding suave
  const allValues = data.flatMap((d) => [d.balancePast, d.balanceFuture].filter((v): v is number => v !== null));
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const padding = Math.max(Math.abs(maxVal - minVal) * 0.15, 100);
  const yDomain = [Math.floor(minVal - padding), Math.ceil(maxVal + padding)] as [number, number];

  // Encontra o label do mês atual (ponto de junção das duas linhas)
  const currentMonthLabel = data.find((d) => !d.isFuture && d.balanceFuture !== null)?.month;

  return (
    <div className="space-y-4">
      {/* Badges de Destaque: Último Saldo Real vs Saldo Estimado Futuro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {lastRealPoint && lastRealPoint.balancePast !== null && (
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">
                Último Saldo Real ({lastRealPoint.month})
              </span>
              <span className="text-lg sm:text-xl font-black text-foreground mt-0.5 block">
                {formatCurrency(lastRealPoint.balancePast)}
              </span>
            </div>
            <Badge variant="outline" className="text-xs font-semibold text-primary bg-primary/10 border-primary/20">
              Realizado
            </Badge>
          </div>
        )}

        {lastProjectedPoint && lastProjectedPoint.balanceFuture !== null && (
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">
                Saldo Projetado em 6m ({lastProjectedPoint.month})
              </span>
              <span className="text-lg sm:text-xl font-black text-blue-400 mt-0.5 block">
                {formatCurrency(lastProjectedPoint.balanceFuture)}
              </span>
            </div>
            <Badge variant="outline" className="text-xs font-semibold text-blue-400 bg-blue-500/10 border-blue-500/20">
              Projeção
            </Badge>
          </div>
        )}
      </div>

      <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
        <AreaChart accessibilityLayer data={data} margin={{ top: 16, right: 16, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBalancePast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorBalanceFuture" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />

          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />

          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            domain={yDomain}
            tickFormatter={formatCompact}
            className="text-xs"
            width={72}
          />

          {/* Linha vertical marcando a divisão passado/futuro */}
          {currentMonthLabel && (
            <ReferenceLine
              x={currentMonthLabel}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: "Hoje",
                position: "insideTopRight",
                fontSize: 11,
                fill: "var(--muted-foreground)",
                dy: -4,
              }}
            />
          )}

          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const point = payload[0].payload as BalanceEvolutionPoint;
                const pointIndex = data.findIndex((d) => d.month === point.month);
                const prevPoint = pointIndex > 0 ? data[pointIndex - 1] : null;

                const currentVal = point.isFuture
                  ? (point.balanceFuture ?? 0)
                  : (point.balancePast ?? point.balanceFuture ?? 0);

                const prevVal = prevPoint
                  ? prevPoint.isFuture
                    ? (prevPoint.balanceFuture ?? 0)
                    : (prevPoint.balancePast ?? prevPoint.balanceFuture ?? 0)
                  : null;

                const diff = prevVal !== null ? currentVal - prevVal : null;

                return (
                  <div className="bg-popover border border-white/10 text-popover-foreground rounded-2xl shadow-xl p-3 min-w-[210px] space-y-2">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                      <span className="font-bold text-xs">{point.month}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                          point.isFuture
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        )}
                      >
                        {point.isFuture ? "Projeção" : "Real"}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] text-muted-foreground font-medium">Saldo no período</div>
                      <div className="text-base font-black text-foreground">{formatCurrency(currentVal)}</div>
                    </div>

                    {diff !== null && (
                      <div className="border-t border-white/5 pt-1.5 flex justify-between text-xs">
                        <span className="text-muted-foreground">Variação:</span>
                        <span
                          className={cn(
                            "font-bold",
                            diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-foreground",
                          )}
                        >
                          {diff > 0 ? "+" : ""}
                          {formatCurrency(diff)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />

          {/* Linha SÓLIDA — saldo histórico real (passado + mês atual) */}
          <Area
            type="monotone"
            dataKey="balancePast"
            name="balancePast"
            stroke={COLOR_PAST}
            strokeWidth={3.5}
            fill="url(#colorBalancePast)"
            dot={false}
            activeDot={{ r: 5, fill: COLOR_PAST, stroke: "var(--background)", strokeWidth: 2 }}
            connectNulls
          />

          {/* Linha TRACEJADA — projeção futura (mês atual + futuros) */}
          <Area
            type="monotone"
            dataKey="balanceFuture"
            name="balanceFuture"
            stroke={COLOR_FUTURE}
            strokeWidth={3}
            strokeDasharray="6 4"
            fill="url(#colorBalanceFuture)"
            dot={false}
            activeDot={{ r: 5, fill: COLOR_FUTURE, stroke: "var(--background)", strokeWidth: 2 }}
            connectNulls
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

export { COLOR_FUTURE, COLOR_PAST };
