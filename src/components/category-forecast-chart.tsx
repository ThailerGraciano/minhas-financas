"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Award,
  Filter,
  Grid3X3,
  Minus,
} from "lucide-react";
import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BASE_COLORS = [
  "hsl(262, 83%, 58%)", // Violeta (Base)
  "hsl(217, 91%, 60%)", // Azul Cobalto
  "hsl(175, 77%, 41%)", // Turquesa
  "hsl(142, 71%, 45%)", // Esmeralda
  "hsl(24, 100%, 50%)", // Laranja
  "hsl(346, 87%, 61%)", // Rosa Coral
  "hsl(43, 100%, 50%)", // Âmbar
  "hsl(199, 89%, 48%)", // Sky Blue
  "hsl(283, 55%, 58%)", // Roxo
  "hsl(0, 84%, 60%)",   // Vermelho
  "hsl(100, 60%, 50%)", // Verde Limão
  "hsl(15, 85%, 55%)",  // Coral Intenso
  "hsl(230, 80%, 65%)", // Indigo
  "hsl(320, 70%, 55%)", // Fuchsia
];

type ChartRowData = Record<string, string | number | boolean>;

type TooltipPayload = {
  dataKey: string;
  name?: string;
  value: number;
  color?: string;
  fill?: string;
  payload: ChartRowData;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  hoveredKey?: string | null;
  showBalance?: boolean;
};

type ExtendedTooltipPayload = TooltipPayload & { originalDataKey: string };

type CategoryKeyMeta = {
  key: string;
  color: string;
  lastActiveIdx: number;
  activeMonthsCount: number;
  totalInWindow: number;
  historicalAvg: number;
  futureAvg: number;
  currentMonthAmount: number;
  trendPercent: number;
  sharePercent: number;
};

function formatShortMonth(monthStr: string): string {
  return monthStr.replace(/\/(\d{2})(\d{2})$/, "/$2");
}

const CustomTooltip = ({
  active,
  payload,
  label,
  hoveredKey,
  showBalance = true,
}: CustomTooltipProps) => {
  const formatCurrency = (val: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const uniqueEntries = payload.reduce((acc: ExtendedTooltipPayload[], entry: TooltipPayload) => {
    const baseKey = String(entry.dataKey).replace(/(_past|_future)$/, "");
    const numericVal = Number(entry.value) || 0;
    if (numericVal <= 0) return acc;

    if (!acc.find((item) => item.dataKey === baseKey)) {
      acc.push({
        ...entry,
        originalDataKey: String(entry.dataKey),
        dataKey: baseKey,
      });
    }
    return acc;
  }, []);

  if (uniqueEntries.length === 0) {
    return null;
  }

  // Invertemos para mostrar do topo da pilha visual até a base
  const displayEntries = [...uniqueEntries].reverse();
  const totalVal = uniqueEntries.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  const isFuture = Boolean(payload[0]?.payload?.isFuture);
  const fullMonthLabel = String(payload[0]?.payload?.month ?? label ?? "");

  return (
    <div className="bg-popover/95 backdrop-blur-md border border-white/10 text-popover-foreground rounded-2xl shadow-2xl p-3 min-w-[225px] max-w-[300px] sm:max-w-[340px] space-y-2 z-50">
      <div className="font-semibold text-xs border-b border-white/10 pb-1.5 flex justify-between items-center gap-2">
        <span className="text-foreground">{fullMonthLabel}</span>
        <Badge
          variant="outline"
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            isFuture
              ? "bg-primary/15 text-primary border-primary/25"
              : "bg-muted text-muted-foreground border-white/10"
          }`}
        >
          {isFuture ? "Previsão" : "Realizado"}
        </Badge>
      </div>

      <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto pr-1">
        {displayEntries.map((entry: ExtendedTooltipPayload) => {
          const val = Number(entry.value) || 0;
          const pct = totalVal > 0 ? (val / totalVal) * 100 : 0;
          const isHovered = hoveredKey === entry.dataKey;
          const isDimmed = Boolean(hoveredKey && !isHovered);

          return (
            <div
              key={entry.dataKey}
              className={`flex items-center justify-between text-xs transition-opacity duration-150 ${
                isDimmed ? "opacity-35" : "opacity-100"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                <span
                  className={`font-medium truncate ${
                    isHovered ? "text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {entry.dataKey}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/80 shrink-0">
                  {pct.toFixed(0)}%
                </span>
              </div>
              <span className="font-bold ml-auto tabular-nums text-foreground shrink-0">
                {formatCurrency(val)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 pt-1.5 flex justify-between items-center text-xs font-bold">
        <span className="text-muted-foreground">
          Total ({uniqueEntries.length} {uniqueEntries.length === 1 ? "categoria" : "categorias"}):
        </span>
        <span className="text-primary tabular-nums">{formatCurrency(totalVal)}</span>
      </div>
    </div>
  );
};

export function CategoryForecastChart({
  data,
  keys,
  showBalance = true,
}: {
  data: ChartRowData[];
  keys: string[];
  showBalance?: boolean;
}) {
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);
  const [hiddenKeys, setHiddenKeys] = React.useState<Set<string>>(new Set());
  const [showAllLegend, setShowAllLegend] = React.useState(false);

  const formatCurrency = React.useCallback(
    (val: number) => {
      if (!showBalance) return "••••••";
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
    },
    [showBalance],
  );

  const formatCompact = React.useCallback(
    (val: number) => {
      if (!showBalance) return "••••";
      const absVal = Math.abs(val);
      const sign = val < 0 ? "-" : "";
      if (absVal === 0) return "R$ 0";
      if (absVal >= 1000) {
        return `${sign}R$ ${(absVal / 1000).toLocaleString("pt-BR", {
          maximumFractionDigits: 1,
        })}k`;
      }
      return `${sign}R$ ${absVal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
    },
    [showBalance],
  );

  // Índice do mês atual (último mês onde !isFuture)
  const currentMonthIdx = React.useMemo(() => {
    let lastNonFuture = -1;
    data.forEach((d, idx) => {
      if (!d.isFuture) {
        lastNonFuture = idx;
      }
    });
    return lastNonFuture === -1 ? 0 : lastNonFuture;
  }, [data]);

  // Calcula metadados e ordena as categorias:
  // As categorias mais recorrentes/duradouras e de maior volume ficam na base (primeiros índices)
  // e as menores ou pontuais ficam no topo.
  const sortedKeyMetas = React.useMemo<CategoryKeyMeta[]>(() => {
    const pastMonthsCount = Math.max(1, currentMonthIdx + 1);
    const futureMonthsCount = Math.max(1, data.length - (currentMonthIdx + 1));

    const rawMetas = keys.map((key, origIdx) => {
      let lastActiveIdx = -1;
      let activeMonthsCount = 0;
      let totalInWindow = 0;
      let historicalSum = 0;
      let futureSum = 0;

      data.forEach((row, idx) => {
        const val = typeof row[key] === "number" ? Number(row[key]) : 0;
        if (val > 0) {
          if (idx > lastActiveIdx) lastActiveIdx = idx;
          activeMonthsCount += 1;
          totalInWindow += val;
          if (row.isFuture) {
            futureSum += val;
          } else {
            historicalSum += val;
          }
        }
      });

      const historicalAvg = historicalSum / pastMonthsCount;
      const futureAvg = futureSum / futureMonthsCount;
      const currentMonthAmount =
        currentMonthIdx >= 0 && typeof data[currentMonthIdx]?.[key] === "number"
          ? Number(data[currentMonthIdx][key])
          : 0;

      const trendPercent =
        historicalAvg > 0 ? ((futureAvg - historicalAvg) / historicalAvg) * 100 : 0;

      return {
        key,
        origIdx,
        lastActiveIdx,
        activeMonthsCount,
        totalInWindow,
        historicalAvg,
        futureAvg,
        currentMonthAmount,
        trendPercent,
      };
    });

    rawMetas.sort((a, b) => {
      // 1. Quem permanece ativa até mais longe no futuro fica na base
      if (a.lastActiveIdx !== b.lastActiveIdx) {
        return b.lastActiveIdx - a.lastActiveIdx;
      }
      // 2. Maior média projetada nos próximos 6 meses fica mais na base (e no topo da lista)
      if (Math.abs(b.futureAvg - a.futureAvg) > 0.01) {
        return b.futureAvg - a.futureAvg;
      }
      // 3. Maior volume total na janela fica na base
      if (Math.abs(b.totalInWindow - a.totalInWindow) > 0.01) {
        return b.totalInWindow - a.totalInWindow;
      }
      return a.origIdx - b.origIdx;
    });

    const totalFutureAvgAll = rawMetas.reduce((acc, m) => acc + m.futureAvg, 0);

    return rawMetas.map((meta, sortedIdx) => ({
      key: meta.key,
      color: BASE_COLORS[sortedIdx % BASE_COLORS.length],
      lastActiveIdx: meta.lastActiveIdx,
      activeMonthsCount: meta.activeMonthsCount,
      totalInWindow: meta.totalInWindow,
      historicalAvg: meta.historicalAvg,
      futureAvg: meta.futureAvg,
      currentMonthAmount: meta.currentMonthAmount,
      trendPercent: meta.trendPercent,
      sharePercent: totalFutureAvgAll > 0 ? (meta.futureAvg / totalFutureAvgAll) * 100 : 0,
    }));
  }, [data, keys, currentMonthIdx]);

  const sortedKeys = React.useMemo(() => sortedKeyMetas.map((m) => m.key), [sortedKeyMetas]);

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    sortedKeyMetas.forEach((meta) => {
      config[meta.key] = {
        label: meta.key,
        color: meta.color,
      };
    });
    return config;
  }, [sortedKeyMetas]);

  const visibleKeyMetas = React.useMemo(
    () => sortedKeyMetas.filter((m) => !hiddenKeys.has(m.key)),
    [sortedKeyMetas, hiddenKeys],
  );

  // Transforma os dados garantindo 0 nos meses sem gasto para não quebrar as faixas empilhadas
  // e dividindo entre realizado (_past) e previsão (_future)
  const transformedData = React.useMemo(() => {
    return data.map((d, index) => {
      const isFuture = Boolean(d.isFuture);
      const isBoundary = index === currentMonthIdx;
      const monthStr = String(d.month);

      const newObj: ChartRowData = {
        month: monthStr,
        shortMonth: formatShortMonth(monthStr),
        isFuture,
      };

      sortedKeys.forEach((key) => {
        const isHidden = hiddenKeys.has(key);
        const numericVal = !isHidden && typeof d[key] === "number" ? Number(d[key]) : 0;

        if (!isFuture && !isBoundary) {
          newObj[`${key}_past`] = numericVal;
        } else if (isBoundary) {
          newObj[`${key}_past`] = numericVal;
          newObj[`${key}_future`] = numericVal;
        } else {
          newObj[`${key}_future`] = numericVal;
        }
      });

      return newObj;
    });
  }, [data, sortedKeys, hiddenKeys, currentMonthIdx]);

  // Métricas de Resumo Executivo (considerando categorias visíveis)
  const summaryStats = React.useMemo(() => {
    let currentMonthTotal = 0;
    let activeCategoriesInCurrent = 0;
    let visibleFutureAvgSum = 0;
    let visibleHistAvgSum = 0;
    let topCategory: CategoryKeyMeta | null = null;

    visibleKeyMetas.forEach((meta) => {
      if (meta.currentMonthAmount > 0) {
        currentMonthTotal += meta.currentMonthAmount;
        activeCategoriesInCurrent += 1;
      }
      visibleFutureAvgSum += meta.futureAvg;
      visibleHistAvgSum += meta.historicalAvg;

      if (!topCategory || meta.futureAvg > topCategory.futureAvg) {
        topCategory = meta;
      }
    });

    const overallTrendPercent =
      visibleHistAvgSum > 0
        ? ((visibleFutureAvgSum - visibleHistAvgSum) / visibleHistAvgSum) * 100
        : 0;

    const topCategoryShare =
      topCategory && visibleFutureAvgSum > 0
        ? ((topCategory as CategoryKeyMeta).futureAvg / visibleFutureAvgSum) * 100
        : 0;

    return {
      currentMonthTotal,
      activeCategoriesInCurrent,
      visibleFutureAvgSum,
      overallTrendPercent,
      topCategory: topCategory as CategoryKeyMeta | null,
      topCategoryShare,
    };
  }, [visibleKeyMetas]);

  const toggleKey = (key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const showAll = () => setHiddenKeys(new Set());
  const hideAll = () => setHiddenKeys(new Set(sortedKeys));
  const selectTop5 = () => {
    const top5ByFuture = [...sortedKeyMetas]
      .sort((a, b) => b.futureAvg - a.futureAvg)
      .slice(0, 5)
      .map((m) => m.key);
    const keepSet = new Set(top5ByFuture);
    const toHide = sortedKeys.filter((k) => !keepSet.has(k));
    setHiddenKeys(new Set(toHide));
  };

  if (data.length === 0 || keys.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-2xl p-4 text-center">
        Nenhum dado disponível para previsão por categoria.
      </div>
    );
  }

  const boundaryShortMonth =
    currentMonthIdx >= 0 && transformedData[currentMonthIdx]
      ? String(transformedData[currentMonthIdx].shortMonth)
      : undefined;

  const displayedLegendMetas = showAllLegend ? sortedKeyMetas : sortedKeyMetas.slice(0, 9);

  return (
    <div className="@container w-full min-w-0 space-y-5">
      {/* 1. Cards de Resumo Executivo (Mobile-First) */}
      <div className="grid grid-cols-2 @xl:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Card 1: Gasto no Mês Atual */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate font-medium">Mês Atual ({boundaryShortMonth})</span>
            <Grid3X3 className="w-3.5 h-3.5 text-primary shrink-0" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-extrabold text-foreground tabular-nums truncate">
              {formatCurrency(summaryStats.currentMonthTotal)}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
              {summaryStats.activeCategoriesInCurrent} cat.
            </span>
          </div>
        </div>

        {/* Card 2: Média Mensal Prevista (Próx. 6 Meses) */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate font-medium">Média Próx. 6 Meses</span>
            <CalendarRange className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-extrabold text-foreground tabular-nums truncate">
              {formatCurrency(summaryStats.visibleFutureAvgSum)}
            </span>
            {Math.abs(summaryStats.overallTrendPercent) >= 1 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0 ${
                  summaryStats.overallTrendPercent < 0
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-rose-500/15 text-rose-400"
                }`}
              >
                {summaryStats.overallTrendPercent > 0 ? "+" : ""}
                {summaryStats.overallTrendPercent.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Categoria de Maior Peso na Projeção */}
        <div className="col-span-2 @xl:col-span-1 rounded-2xl bg-primary/[0.08] border border-primary/20 p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-[11px] text-primary">
            <span className="truncate font-semibold">Maior Peso nos Próx. 6 Meses</span>
            <Award className="w-3.5 h-3.5 text-primary shrink-0" />
          </div>
          {summaryStats.topCategory ? (
            <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: summaryStats.topCategory.color }}
                />
                <span className="text-sm sm:text-base font-extrabold text-foreground truncate">
                  {summaryStats.topCategory.key}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 tabular-nums shrink-0">
                {formatCurrency(summaryStats.topCategory.futureAvg)}/mês (
                {summaryStats.topCategoryShare.toFixed(0)}%)
              </span>
            </div>
          ) : (
            <span className="mt-1.5 text-xs text-muted-foreground">Nenhuma categoria selecionada</span>
          )}
        </div>
      </div>

      {/* 2. Gráfico Empilhado de Categorias (Base = mais recorrentes/maiores → Topo = menores) */}
      <div className="rounded-2xl bg-black/20 border border-white/[0.06] p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            <span>
              <strong>Base → Topo:</strong> categorias contínuas e maiores ficam na base
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-3.5 border-t border-dashed border-muted-foreground inline-block" />
              Realizado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3.5 border-t-2 border-primary inline-block" />
              Previsão (6m)
            </span>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="h-[230px] sm:h-[300px] w-full aspect-auto">
          <AreaChart
            accessibilityLayer
            data={transformedData}
            margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              {sortedKeyMetas.map((meta, index) => (
                <linearGradient key={meta.key} id={`fill-cat-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={meta.color} stopOpacity={0.75} />
                  <stop offset="95%" stopColor={meta.color} stopOpacity={0.16} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="shortMonth"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              minTickGap={16}
              className="text-[10px] sm:text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompact}
              className="text-[10px] sm:text-xs"
              width={56}
            />
            {boundaryShortMonth && (
              <ReferenceLine
                x={boundaryShortMonth}
                stroke="rgba(255,255,255,0.22)"
                strokeDasharray="3 3"
              />
            )}
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.18)", strokeWidth: 1 }}
              content={<CustomTooltip hoveredKey={hoveredKey} showBalance={showBalance} />}
            />

            {sortedKeyMetas.map((meta, index) => {
              const isFaded = Boolean(hoveredKey && hoveredKey !== meta.key);
              const opacity = isFaded ? 0.2 : 1;

              return (
                <React.Fragment key={meta.key}>
                  <Area
                    type="monotone"
                    dataKey={`${meta.key}_past`}
                    stackId="past"
                    stroke={meta.color}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill={`url(#fill-cat-${index})`}
                    opacity={opacity}
                    onMouseEnter={() => setHoveredKey(meta.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    style={{ transition: "opacity 0.2s ease-in-out", cursor: "pointer" }}
                  />
                  <Area
                    type="monotone"
                    dataKey={`${meta.key}_future`}
                    stackId="future"
                    stroke={meta.color}
                    strokeWidth={1.75}
                    fill={`url(#fill-cat-${index})`}
                    opacity={opacity}
                    onMouseEnter={() => setHoveredKey(meta.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    style={{ transition: "opacity 0.2s ease-in-out", cursor: "pointer" }}
                  />
                </React.Fragment>
              );
            })}
          </AreaChart>
        </ChartContainer>

        {/* 3. Painel de Categorias & Filtros Interativos */}
        <div className="pt-2.5 border-t border-white/[0.06] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>
                Categorias ({visibleKeyMetas.length}/{sortedKeyMetas.length} ativas) — toque para
                filtrar
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {sortedKeyMetas.length > 5 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectTop5}
                  className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground"
                >
                  Top 5
                </Button>
              )}
              {hiddenKeys.size > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={showAll}
                  className="text-[11px] h-6 px-2 text-primary hover:text-primary"
                >
                  Mostrar todas
                </Button>
              )}
              {hiddenKeys.size < sortedKeyMetas.length && sortedKeyMetas.length > 4 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={hideAll}
                  className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground"
                >
                  Ocultar todas
                </Button>
              )}
              {sortedKeyMetas.length > 9 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllLegend((prev) => !prev)}
                  className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <span>{showAllLegend ? "Recolher" : `Ver todas (${sortedKeyMetas.length})`}</span>
                  {showAllLegend ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-2">
            {displayedLegendMetas.map((meta, idx) => {
              const isHidden = hiddenKeys.has(meta.key);
              const isHovered = hoveredKey === meta.key;
              const isRising = meta.trendPercent > 3;
              const isFalling = meta.trendPercent < -3;

              return (
                <button
                  key={meta.key}
                  type="button"
                  onClick={() => toggleKey(meta.key)}
                  onMouseEnter={() => setHoveredKey(meta.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  title={isHidden ? "Toque para exibir no gráfico" : "Toque para ocultar do gráfico"}
                  className={`group flex flex-col justify-between gap-2 p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer min-w-0 ${
                    isHidden
                      ? "bg-white/[0.01] border-white/[0.04] opacity-40"
                      : isHovered
                        ? "bg-white/[0.08] border-white/20 shadow-sm"
                        : "bg-white/[0.025] border-white/[0.06] hover:bg-white/[0.05]"
                  }`}
                >
                  {/* Linha 1: Nome da Categoria + Tag Base */}
                  <div className="flex items-center justify-between gap-1.5 min-w-0 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span
                        className={`text-xs font-semibold truncate ${
                          isHidden ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {meta.key}
                      </span>
                    </div>

                    {idx === 0 && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground shrink-0">
                        Base
                      </span>
                    )}
                  </div>

                  {/* Linha 2: Tags acima do valor (% do total + Tendência) */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full">
                    <span className="inline-flex items-center text-[10px] font-mono font-semibold text-muted-foreground bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded-full tabular-nums">
                      {meta.sharePercent.toFixed(0)}% do total
                    </span>

                    {isFalling ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full tabular-nums">
                        <ArrowDownRight className="w-2.5 h-2.5" />
                        {Math.abs(meta.trendPercent).toFixed(0)}%
                      </span>
                    ) : isRising ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded-full tabular-nums">
                        <ArrowUpRight className="w-2.5 h-2.5" />
                        +{meta.trendPercent.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                        <Minus className="w-2.5 h-2.5" />
                        Estável
                      </span>
                    )}
                  </div>

                  {/* Linha 3: Valor esticado de ponta a ponta sem cortar */}
                  <div className="flex items-baseline justify-between gap-1.5 w-full pt-0.5">
                    <span className="text-[11px] text-muted-foreground shrink-0">Média 6m:</span>
                    <strong className="text-xs sm:text-sm font-extrabold text-foreground tabular-nums whitespace-nowrap">
                      {formatCurrency(meta.futureAvg)}
                    </strong>
                  </div>

                  {/* Barra proporcional de participação no orçamento futuro */}
                  <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(4, meta.sharePercent))}%`,
                        backgroundColor: meta.color,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
