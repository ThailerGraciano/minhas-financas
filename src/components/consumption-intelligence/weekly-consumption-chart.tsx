"use client";

import { Badge } from "@/components/ui/badge";
import type { WeeklyConsumptionPoint } from "@/lib/consumption-intelligence";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CONFIDENCE_META, STATUS_META, formatCompactBRL, formatCurrencyBRL } from "./constants";

interface WeeklyConsumptionChartProps {
  weeks: WeeklyConsumptionPoint[];
  showBalance?: boolean;
  onSelectWeek?: (weekNumber: 1 | 2 | 3 | 4 | 5) => void;
}

type ChartViewMode = "full_with_projection" | "to_date_only";

interface WeeklyChartRow {
  weekNumber: 1 | 2 | 3 | 4 | 5;
  label: string;
  dateRangeLabel: string;
  actualDisplay: number;
  projectedRemainingDisplay: number;
  expectedDisplay: number;
  bandBase: number;
  bandSpan: number;
  bandHigh: number;
  raw: WeeklyConsumptionPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: WeeklyChartRow;
  }>;
  showBalance: boolean;
  mode: ChartViewMode;
}

function WeeklyConsumptionTooltip({ active, payload, showBalance, mode }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const w = row.raw;
  const statusMeta = STATUS_META[w.status];
  const confMeta = CONFIDENCE_META[w.confidence];

  return (
    <div className="bg-popover/95 backdrop-blur-xl border border-white/15 rounded-2xl px-3.5 py-3 shadow-2xl text-xs min-w-[245px] max-w-[300px] space-y-2">
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
        <div>
          <span className="font-bold text-foreground">{w.label}</span>
          <span className="text-[11px] text-muted-foreground ml-1.5">({w.dateRangeLabel})</span>
        </div>
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusMeta.badgeClass)}>
          {statusMeta.label}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">
            {w.isPartial ? `Realizado (${w.elapsedDays}/${w.dayCount}d):` : "Consumo realizado:"}
          </span>
          <span className="font-bold tabular-nums text-foreground">
            {formatCurrencyBRL(w.actualToDate, showBalance)}
          </span>
        </div>

        {w.state !== "future" && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              {w.isPartial ? `Esperado até dia ${w.elapsedDays}:` : "Média histórica esperada:"}
            </span>
            <span className="font-semibold tabular-nums text-foreground/90">
              {w.referenceSource === "none"
                ? "Sem base"
                : formatCurrencyBRL(w.expectedToDateMean, showBalance)}
            </span>
          </div>
        )}

        {w.state !== "future" && w.referenceSource !== "none" && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Diferença equivalente:</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                w.differenceAmount > 0 ? "text-rose-400" : "text-emerald-400",
              )}
            >
              {w.differenceAmount > 0 ? "+" : ""}
              {formatCurrencyBRL(w.differenceAmount, showBalance)}
              {w.differencePercent !== null
                ? ` (${w.differencePercent > 0 ? "+" : ""}${w.differencePercent.toFixed(0)}%)`
                : ""}
            </span>
          </div>
        )}

        {(mode === "full_with_projection" || w.state !== "completed") && w.state !== "completed" && (
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10">
            <span className="text-muted-foreground">Previsão da semana:</span>
            <span className="font-bold tabular-nums text-primary">
              {formatCurrencyBRL(w.projectedTotal, showBalance)}
            </span>
          </div>
        )}

        {w.referenceSource === "history" && (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Média semana cheia:</span>
              <span className="tabular-nums text-muted-foreground">
                {formatCurrencyBRL(w.expectedFullMean, showBalance)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Faixa histórica:</span>
              <span className="tabular-nums text-violet-300">
                {formatCurrencyBRL(w.varianceBandLow, showBalance)} –{" "}
                {formatCurrencyBRL(w.varianceBandHigh, showBalance)}
              </span>
            </div>
          </>
        )}

        {w.referenceSource === "provisional_budget" && (
          <div className="text-[10px] text-amber-300/90 pt-0.5">
            Referência provisória baseada no orçamento (sem histórico).
          </div>
        )}
      </div>

      <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>
          Base: {w.validObservations}/3 comp. • Confiança:{" "}
          <strong className={cn("font-semibold", confMeta.badgeClass.split(" ").pop())}>{confMeta.label}</strong>
        </span>
        <span className="text-primary font-medium">Clique p/ auditar</span>
      </div>
    </div>
  );
}

export function WeeklyConsumptionChart({
  weeks,
  showBalance = true,
  onSelectWeek,
}: WeeklyConsumptionChartProps) {
  const hasPartialWeek = weeks.some((w) => w.isPartial);
  const [mode, setMode] = useState<ChartViewMode>("full_with_projection");

  const chartData: WeeklyChartRow[] = useMemo(() => {
    return weeks.map((w) => {
      if (mode === "to_date_only") {
        const expected = w.state === "future" ? 0 : w.expectedToDateMean;
        const std =
          w.state === "future"
            ? 0
            : w.validObservations >= 2
              ? Math.max(w.expectedToDateStdDev, expected * 0.1)
              : w.validObservations === 1
                ? expected * 0.15
                : 0;
        const low = w.referenceSource === "history" && w.state !== "future" ? Math.max(0, expected - std) : 0;
        const high = w.referenceSource === "history" && w.state !== "future" ? expected + std : 0;

        return {
          weekNumber: w.weekNumber,
          label: w.label,
          dateRangeLabel: w.dateRangeLabel,
          actualDisplay: w.actualToDate,
          projectedRemainingDisplay: 0,
          expectedDisplay: expected,
          bandBase: low,
          bandSpan: Math.max(0, high - low),
          bandHigh: high,
          raw: w,
        };
      }

      return {
        weekNumber: w.weekNumber,
        label: w.label,
        dateRangeLabel: w.dateRangeLabel,
        actualDisplay: w.actualToDate,
        projectedRemainingDisplay: w.state === "completed" ? 0 : w.projectedRemaining,
        expectedDisplay: w.expectedFullMean,
        bandBase: w.varianceBandLow,
        bandSpan: Math.max(0, w.varianceBandHigh - w.varianceBandLow),
        bandHigh: w.varianceBandHigh,
        raw: w,
      };
    });
  }, [weeks, mode]);

  if (weeks.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground border border-dashed border-white/10 rounded-2xl">
        Nenhuma semana calculada para esta competência.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#00D287]" />
            Realizado
          </span>
          {mode === "full_with_projection" && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary/45 border border-primary/70" />
              Projeção restante
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-white/30" />
            Média esperada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-3.5 rounded-sm bg-violet-400/25 border border-violet-400/50" />
            Faixa histórica
          </span>
        </div>

        {hasPartialWeek && (
          <div
            role="group"
            aria-label="Modo de comparação semanal"
            className="inline-flex items-center rounded-full bg-white/[0.04] p-0.5 border border-white/[0.08] text-[11px]"
          >
            <button
              type="button"
              onClick={() => setMode("full_with_projection")}
              className={cn(
                "px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer",
                mode === "full_with_projection"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Semana c/ projeção
            </button>
            <button
              type="button"
              onClick={() => setMode("to_date_only")}
              className={cn(
                "px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer",
                mode === "to_date_only"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Equivalente até hoje
            </button>
          </div>
        )}
      </div>

      <div className="h-[270px] sm:h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -8, bottom: 4 }}
            barGap={6}
            onClick={(state) => {
              if (!onSelectWeek) return;
              const rawIdx = state?.activeTooltipIndex;
              const idx = rawIdx !== undefined && rawIdx !== null ? Number(rawIdx) : -1;
              if (Number.isInteger(idx) && idx >= 0 && idx < chartData.length) {
                onSelectWeek(chartData[idx].weekNumber);
              }
            }}
          >
            <defs>
              <linearGradient id="ciVarianceBandFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A855F7" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#A855F7" stopOpacity={0.07} />
              </linearGradient>
            </defs>

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
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={<WeeklyConsumptionTooltip showBalance={showBalance} mode={mode} />}
            />

            {/* Faixa de variação histórica (base transparente + amplitude da banda) */}
            <Area
              type="monotone"
              dataKey="bandBase"
              stackId="varianceBand"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="bandSpan"
              stackId="varianceBand"
              stroke="rgba(168, 85, 247, 0.45)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              fill="url(#ciVarianceBandFill)"
              isAnimationActive={false}
              name="Faixa histórica"
            />

            {/* Barra de média histórica esperada */}
            <Bar
              dataKey="expectedDisplay"
              name="Média esperada"
              fill="rgba(255, 255, 255, 0.22)"
              radius={[6, 6, 0, 0]}
              barSize={22}
              cursor="pointer"
            />

            {/* Barra empilhada: Realizado + Projeção restante */}
            <Bar
              dataKey="actualDisplay"
              stackId="actual"
              name="Consumo realizado"
              radius={[3, 3, 0, 0]}
              barSize={22}
              cursor="pointer"
            >
              {chartData.map((entry) => (
                <Cell key={entry.label} fill={STATUS_META[entry.raw.status].barColor} />
              ))}
            </Bar>

            {mode === "full_with_projection" && (
              <Bar
                dataKey="projectedRemainingDisplay"
                stackId="actual"
                name="Projeção restante"
                fill="rgba(130, 10, 209, 0.42)"
                stroke="rgba(168, 85, 247, 0.85)"
                strokeDasharray="3 2"
                radius={[6, 6, 0, 0]}
                barSize={22}
                cursor="pointer"
              />
            )}

            {/* Linha guia da média esperada */}
            <Line
              type="monotone"
              dataKey="expectedDisplay"
              stroke="rgba(226, 232, 240, 0.6)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: "#E2E8F0", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
              tooltipType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Pílulas rápidas das semanas (acessível em toque e teclado para auditar) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {weeks.map((w) => {
          const statusMeta = STATUS_META[w.status];
          return (
            <button
              key={w.weekNumber}
              type="button"
              onClick={() => onSelectWeek?.(w.weekNumber)}
              className={cn(
                "text-left rounded-xl px-2.5 py-2 border transition-all cursor-pointer",
                w.state === "in_progress"
                  ? "bg-primary/10 border-primary/40 hover:bg-primary/15"
                  : "bg-white/[0.025] border-white/[0.07] hover:bg-white/[0.06]",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-foreground">{w.label}</span>
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: statusMeta.barColor }}
                  title={statusMeta.label}
                />
              </div>
              <div className="text-[10px] text-muted-foreground">{w.dateRangeLabel}</div>
              <div className="mt-1 text-xs font-bold tabular-nums text-foreground">
                {formatCurrencyBRL(w.actualToDate, showBalance)}
              </div>
              <div className="text-[10px] text-muted-foreground tabular-nums truncate">
                {w.state === "future"
                  ? `Prev: ${formatCompactBRL(w.projectedTotal, showBalance)}`
                  : w.referenceSource === "none"
                    ? "Sem histórico"
                    : `Esp: ${formatCompactBRL(w.expectedToDateMean, showBalance)}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
