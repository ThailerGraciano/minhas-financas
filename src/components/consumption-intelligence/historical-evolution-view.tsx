"use client";

import { Badge } from "@/components/ui/badge";
import type { HistoricalCompetencyPoint, HistoricalTrend } from "@/lib/consumption-intelligence";
import { cn } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TREND_META, formatCompactBRL, formatCurrencyBRL } from "./constants";

interface HistoricalEvolutionViewProps {
  months: HistoricalCompetencyPoint[];
  trend: HistoricalTrend;
  trendPercent: number | null;
  showBalance?: boolean;
}

interface EvolutionChartRow {
  label: string;
  realized: number;
  projectedExtra: number;
  raw: HistoricalCompetencyPoint;
}

interface EvolutionTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: EvolutionChartRow;
  }>;
  showBalance: boolean;
}

function EvolutionTooltip({ active, payload, showBalance }: EvolutionTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const m = row.raw;

  return (
    <div className="bg-popover/95 backdrop-blur-xl border border-white/15 rounded-2xl px-3.5 py-2.5 shadow-2xl text-xs min-w-[215px] space-y-1.5">
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/10">
        <span className="font-bold text-foreground">{m.label}</span>
        <Badge variant="outline" className="text-[10px] border-white/15">
          {m.isTarget ? "Competência atual" : m.hasValidData ? "Referência válida" : "Sem histórico válido"}
        </Badge>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">Consumo recorrente:</span>
        <span className="font-bold tabular-nums text-foreground">
          {m.hasValidData || m.isTarget ? formatCurrencyBRL(m.totalRecurring, showBalance) : "Sem dados"}
        </span>
      </div>
      {m.isTarget && m.projectedRecurring !== null && (
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Previsão provável:</span>
          <span className="font-semibold tabular-nums text-primary">
            {formatCurrencyBRL(m.projectedRecurring, showBalance)}
          </span>
        </div>
      )}
      <div className="pt-1 border-t border-white/10 space-y-0.5 text-[11px] text-muted-foreground">
        <div className="flex justify-between gap-3">
          <span>Parceladas (separado):</span>
          <span className="tabular-nums text-indigo-300">{formatCurrencyBRL(m.installmentTotal, showBalance)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Fixas (excluídas):</span>
          <span className="tabular-nums">{formatCurrencyBRL(m.fixedTotal, showBalance)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Extraordinárias (excluídas):</span>
          <span className="tabular-nums">{formatCurrencyBRL(m.extraordinaryTotal, showBalance)}</span>
        </div>
      </div>
    </div>
  );
}

export function HistoricalEvolutionView({
  months,
  trend,
  trendPercent,
  showBalance = true,
}: HistoricalEvolutionViewProps) {
  const trendMeta = TREND_META[trend];
  const chartData: EvolutionChartRow[] = months.map((m) => ({
    label: m.label,
    realized: m.totalRecurring,
    projectedExtra:
      m.isTarget && m.projectedRecurring !== null ? Math.max(0, m.projectedRecurring - m.totalRecurring) : 0,
    raw: m,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Evolução das 3 competências de referência</h3>
          <p className="text-xs text-muted-foreground">
            Competências sem histórico válido não são tratadas como gasto zero no cálculo das médias.
          </p>
        </div>
        <Badge variant="outline" className={cn("text-xs gap-1.5", trendMeta.badgeClass)}>
          {trend === "increasing" && <TrendingUp className="h-3.5 w-3.5" />}
          {trend === "decreasing" && <TrendingDown className="h-3.5 w-3.5" />}
          {(trend === "stable" || trend === "insufficient_data") && <Minus className="h-3.5 w-3.5" />}
          <span>
            {trendMeta.label}
            {trendPercent !== null ? ` (${trendPercent > 0 ? "+" : ""}${trendPercent.toFixed(1)}%)` : ""}
          </span>
        </Badge>
      </div>

      <div className="h-[220px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatCompactBRL(v, showBalance)}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={68}
            />
            <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<EvolutionTooltip showBalance={showBalance} />} />
            <Bar dataKey="realized" stackId="evo" radius={[4, 4, 0, 0]} barSize={32}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.label}
                  fill={
                    entry.raw.isTarget
                      ? "#00D287"
                      : entry.raw.hasValidData
                        ? "rgba(148, 163, 184, 0.5)"
                        : "rgba(148, 163, 184, 0.14)"
                  }
                />
              ))}
            </Bar>
            <Bar
              dataKey="projectedExtra"
              stackId="evo"
              fill="rgba(130, 10, 209, 0.45)"
              stroke="rgba(168, 85, 247, 0.85)"
              strokeDasharray="3 2"
              radius={[6, 6, 0, 0]}
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {months.map((m) => (
          <div
            key={m.month}
            className={cn(
              "rounded-2xl border p-3 space-y-1",
              m.isTarget ? "bg-primary/10 border-primary/35" : "bg-white/[0.025] border-white/[0.07]",
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-foreground">{m.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {m.isTarget ? "Atual" : m.hasValidData ? `${m.transactionCount} lanç.` : "Sem dados"}
              </span>
            </div>
            <div className="text-sm font-bold tabular-nums text-foreground">
              {m.hasValidData || m.isTarget ? formatCurrencyBRL(m.totalRecurring, showBalance) : "—"}
            </div>
            {m.isTarget && m.projectedRecurring !== null && (
              <div className="text-[11px] text-primary tabular-nums">
                Prev: {formatCurrencyBRL(m.projectedRecurring, showBalance)}
              </div>
            )}
            <div className="text-[10px] text-indigo-300/90 tabular-nums">
              Parceladas: {formatCurrencyBRL(m.installmentTotal, showBalance)}
            </div>
            {!m.isTarget && (
              <div className="text-[10px] text-muted-foreground">
                {m.hasValidData ? "Incluída na média" : "Ignorada (sem histórico)"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
