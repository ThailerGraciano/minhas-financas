"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Minus,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = [
  "hsl(262, 83%, 58%)", // Violeta (Base)
  "hsl(217, 91%, 60%)", // Azul Cobalto
  "hsl(175, 77%, 41%)", // Turquesa
  "hsl(142, 71%, 45%)", // Verde Esmeralda
  "hsl(24, 100%, 50%)", // Laranja
  "hsl(346, 87%, 61%)", // Rosa Coral
  "hsl(43, 100%, 50%)", // Âmbar
  "hsl(283, 55%, 58%)", // Roxo
  "hsl(199, 89%, 48%)", // Sky Blue
  "hsl(0, 84%, 60%)",   // Vermelho
  "hsl(100, 60%, 50%)", // Verde Limão
  "hsl(15, 85%, 55%)",  // Coral Intenso
];

type ChartRowData = Record<string, string | number | boolean>;

type TooltipPayloadItem = {
  dataKey: string;
  name?: string;
  value: number;
  color?: string;
  fill?: string;
  payload: ChartRowData;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  hoveredKey?: string | null;
  showBalance?: boolean;
};

type ExtendedTooltipPayload = TooltipPayloadItem & { originalDataKey: string };

type InstallmentKeyMeta = {
  key: string;
  color: string;
  lastActiveIdx: number;
  firstActiveIdx: number;
  activeMonthsCount: number;
  remainingAfterWindow: number;
  truePayoffScore: number;
  totalInWindow: number;
  currentMonthAmount: number;
  latestInstallmentLabel: string;
  endMonthLabel: string;
};

type MonthlyChangeItem = {
  name: string;
  amount: number;
  installment?: string;
};

type SixMonthVariationPoint = {
  month: string;
  shortMonth: string;
  total: number;
  prevTotal: number;
  monthlyDelta: number;
  cumulativeDelta: number;
  reliefAmount: number;
  increaseAmount: number;
  endingItems: MonthlyChangeItem[];
  startingItems: MonthlyChangeItem[];
};

function formatShortMonth(monthStr: string): string {
  // Converte "Ago/2026" -> "Ago/26" para não cortar ou aglomerar no mobile
  return monthStr.replace(/\/(\d{2})(\d{2})$/, "/$2");
}

function parseInstallmentTag(tag: string | number | boolean | undefined): {
  current: number;
  total: number;
} | null {
  if (typeof tag !== "string") return null;
  const match = /^(\d+)\/(\d+)$/.exec(tag.trim());
  if (!match) return null;
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (Number.isNaN(current) || Number.isNaN(total)) return null;
  return { current, total };
}

const StackedChartTooltip = ({
  active,
  payload,
  label,
  hoveredKey,
  showBalance = true,
}: CustomTooltipProps) => {
  const formatCurrency = (value: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const uniqueEntries = payload.reduce((acc: ExtendedTooltipPayload[], entry: TooltipPayloadItem) => {
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

  // Invertemos para exibir do topo da pilha visual até a base
  const displayEntries = [...uniqueEntries].reverse();
  const totalVal = uniqueEntries.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  const fullMonthLabel = String(payload[0]?.payload?.month ?? label ?? "");
  const isPastMonth = Boolean(payload[0]?.payload?.isPast);

  return (
    <div className="bg-popover/95 backdrop-blur-md border border-white/10 text-popover-foreground rounded-2xl shadow-2xl p-3 min-w-[220px] max-w-[290px] sm:max-w-[330px] space-y-2 z-50">
      <div className="font-semibold text-xs border-b border-white/10 pb-1.5 flex justify-between items-center gap-2">
        <span className="text-foreground">{fullMonthLabel}</span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            isPastMonth
              ? "bg-muted text-muted-foreground"
              : "bg-primary/15 text-primary border border-primary/25"
          }`}
        >
          {isPastMonth ? "Histórico" : "Projeção"}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto pr-1">
        {displayEntries.map((entry: ExtendedTooltipPayload) => {
          const baseKey = entry.dataKey;
          const installmentText =
            entry.payload[`${entry.originalDataKey}_installment`] ??
            entry.payload[`${baseKey}_installment`];
          const isHovered = hoveredKey === baseKey;
          const isDimmed = Boolean(hoveredKey && !isHovered);

          return (
            <div
              key={baseKey}
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
                  {baseKey}
                </span>
                {installmentText ? (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-muted-foreground shrink-0">
                    {String(installmentText)}
                  </span>
                ) : null}
              </div>
              <span className="font-bold ml-auto shrink-0 tabular-nums text-foreground">
                {formatCurrency(Number(entry.value))}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 pt-1.5 flex justify-between items-center text-xs font-bold">
        <span className="text-muted-foreground">
          Total ({uniqueEntries.length} {uniqueEntries.length === 1 ? "parcela" : "parcelas"}):
        </span>
        <span className="text-primary tabular-nums">{formatCurrency(totalVal)}</span>
      </div>
    </div>
  );
};

type VariationTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: SixMonthVariationPoint }>;
  variationMode: "monthly" | "cumulative";
  showBalance?: boolean;
};

const VariationChartTooltip = ({
  active,
  payload,
  variationMode,
  showBalance = true,
}: VariationTooltipProps) => {
  const formatCurrency = (value: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) return null;

  const delta = variationMode === "monthly" ? point.monthlyDelta : point.cumulativeDelta;
  const isRelief = delta < -0.005;
  const isIncrease = delta > 0.005;

  return (
    <div className="bg-popover/95 backdrop-blur-md border border-white/10 text-popover-foreground rounded-2xl shadow-2xl p-3 min-w-[230px] max-w-[300px] space-y-2 z-50 text-xs">
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 gap-2">
        <span className="font-bold text-foreground">{point.month}</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          Fatura: <strong className="text-foreground">{formatCurrency(point.total)}</strong>
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {variationMode === "monthly" ? "Variação no mês:" : "Diferença vs. mês atual:"}
          </span>
          <span
            className={`font-bold tabular-nums ${
              isRelief
                ? "text-emerald-400"
                : isIncrease
                  ? "text-rose-400"
                  : "text-muted-foreground"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {formatCurrency(delta)}
          </span>
        </div>

        {variationMode === "monthly" && Math.abs(point.cumulativeDelta) > 0.005 && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Acumulado vs. hoje:</span>
            <span
              className={`font-semibold tabular-nums ${
                point.cumulativeDelta < 0 ? "text-emerald-400/90" : "text-rose-400/90"
              }`}
            >
              {point.cumulativeDelta > 0 ? "+" : ""}
              {formatCurrency(point.cumulativeDelta)}
            </span>
          </div>
        )}
      </div>

      {point.endingItems.length > 0 && (
        <div className="pt-1.5 border-t border-white/10 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" />
            <span>Parcelas que saem / reduzem neste mês</span>
          </div>
          <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
            {point.endingItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-muted-foreground">{item.name}</span>
                <span className="text-emerald-400 font-semibold tabular-nums shrink-0">
                  -{formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {point.startingItems.length > 0 && (
        <div className="pt-1.5 border-t border-white/10 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>Parcelas que entram / aumentam</span>
          </div>
          <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
            {point.startingItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-muted-foreground">{item.name}</span>
                <span className="text-rose-400 font-semibold tabular-nums shrink-0">
                  +{formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {point.endingItems.length === 0 && point.startingItems.length === 0 && (
        <p className="text-[11px] text-muted-foreground pt-1 border-t border-white/10">
          Nenhuma parcela termina ou inicia neste mês.
        </p>
      )}
    </div>
  );
};

export function InstallmentsStackedChart({
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
  const [variationMode, setVariationMode] = React.useState<"monthly" | "cumulative">("monthly");

  const formatCurrency = React.useCallback(
    (value: number) => {
      if (!showBalance) return "••••••";
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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

  const currentMonthIdx = React.useMemo(() => {
    const idx = data.findIndex((d) => !d.isPast);
    return idx === -1 ? Math.max(0, data.length - 1) : idx;
  }, [data]);

  // Calcula metadados e ordena as despesas:
  // As que demoram mais tempo para quitar (maior duração para a direita / mais parcelas restantes / maior base horizontal)
  // ficam nos primeiros índices (base do gráfico empilhado), e as mais curtas ficam por cima (últimos índices).
  const sortedKeyMetas = React.useMemo<InstallmentKeyMeta[]>(() => {
    const rawMetas = keys.map((key, origIdx) => {
      let lastActiveIdx = -1;
      let firstActiveIdx = data.length;
      let activeMonthsCount = 0;
      let totalInWindow = 0;
      let latestInstallmentLabel = "";

      data.forEach((row, idx) => {
        const val = typeof row[key] === "number" ? Number(row[key]) : 0;
        if (val > 0) {
          if (idx > lastActiveIdx) {
            lastActiveIdx = idx;
          }
          if (idx < firstActiveIdx) {
            firstActiveIdx = idx;
          }
          activeMonthsCount += 1;
          totalInWindow += val;
          const instTag = row[`${key}_installment`];
          if (typeof instTag === "string") {
            latestInstallmentLabel = instTag;
          }
        }
      });

      const lastRowInst =
        lastActiveIdx >= 0 ? parseInstallmentTag(data[lastActiveIdx]?.[`${key}_installment`]) : null;
      const remainingAfterWindow =
        lastRowInst && lastRowInst.total > lastRowInst.current
          ? lastRowInst.total - lastRowInst.current
          : 0;

      // Pontuação de término real: índice do último mês visível + parcelas que ainda restam após a janela
      const truePayoffScore = lastActiveIdx + remainingAfterWindow;

      const currentMonthAmount =
        currentMonthIdx >= 0 && typeof data[currentMonthIdx]?.[key] === "number"
          ? Number(data[currentMonthIdx][key])
          : 0;

      const currentRowInst =
        currentMonthIdx >= 0 ? data[currentMonthIdx]?.[`${key}_installment`] : undefined;
      if (typeof currentRowInst === "string") {
        latestInstallmentLabel = currentRowInst;
      }

      const endMonthRaw = lastActiveIdx >= 0 ? String(data[lastActiveIdx]?.month ?? "") : "";
      const endMonthLabel =
        remainingAfterWindow > 0
          ? `+${remainingAfterWindow} após ${formatShortMonth(endMonthRaw)}`
          : formatShortMonth(endMonthRaw);

      return {
        key,
        origIdx,
        lastActiveIdx,
        firstActiveIdx,
        activeMonthsCount,
        remainingAfterWindow,
        truePayoffScore,
        totalInWindow,
        currentMonthAmount,
        latestInstallmentLabel,
        endMonthLabel,
      };
    });

    rawMetas.sort((a, b) => {
      // 1. Quem permanece ativo até mais longe dentro da janela visível fica mais na base
      if (a.lastActiveIdx !== b.lastActiveIdx) {
        return b.lastActiveIdx - a.lastActiveIdx;
      }
      // 2. Se ambos chegam ao mesmo mês (ex: fim do gráfico), quem tem mais parcelas restantes para quitar fica mais na base
      if (a.remainingAfterWindow !== b.remainingAfterWindow) {
        return b.remainingAfterWindow - a.remainingAfterWindow;
      }
      // 3. Maior duração horizontal dentro do gráfico (começa antes / dura mais meses) fica mais na base
      if (a.activeMonthsCount !== b.activeMonthsCount) {
        return b.activeMonthsCount - a.activeMonthsCount;
      }
      if (a.firstActiveIdx !== b.firstActiveIdx) {
        return a.firstActiveIdx - b.firstActiveIdx;
      }
      // 4. Maior valor total na base
      if (Math.abs(b.totalInWindow - a.totalInWindow) > 0.01) {
        return b.totalInWindow - a.totalInWindow;
      }
      return a.origIdx - b.origIdx;
    });

    return rawMetas.map((meta, sortedIdx) => ({
      key: meta.key,
      color: COLORS[sortedIdx % COLORS.length],
      lastActiveIdx: meta.lastActiveIdx,
      firstActiveIdx: meta.firstActiveIdx,
      activeMonthsCount: meta.activeMonthsCount,
      remainingAfterWindow: meta.remainingAfterWindow,
      truePayoffScore: meta.truePayoffScore,
      totalInWindow: meta.totalInWindow,
      currentMonthAmount: meta.currentMonthAmount,
      latestInstallmentLabel: meta.latestInstallmentLabel,
      endMonthLabel: meta.endMonthLabel,
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

  // Transforma os dados preenchendo 0 nos meses sem parcela dentro de cada segmento (passado/futuro)
  // para evitar degraus cortados no ar e manter as camadas da base perfeitamente contínuas.
  const transformedData = React.useMemo(() => {
    return data.map((d, index) => {
      const isPast = Boolean(d.isPast);
      const isBoundary = !isPast && (index === 0 || Boolean(data[index - 1]?.isPast));
      const monthStr = String(d.month);

      const newObj: ChartRowData = {
        month: monthStr,
        shortMonth: formatShortMonth(monthStr),
        isPast,
      };

      sortedKeys.forEach((key) => {
        const isHidden = hiddenKeys.has(key);
        const numericVal = !isHidden && typeof d[key] === "number" ? Number(d[key]) : 0;
        const instText = d[`${key}_installment`];

        if (instText !== undefined) {
          newObj[`${key}_installment`] = instText;
        }

        if (isPast) {
          newObj[`${key}_past`] = numericVal;
          if (instText) newObj[`${key}_past_installment`] = instText;
        } else if (isBoundary) {
          newObj[`${key}_past`] = numericVal;
          newObj[`${key}_future`] = numericVal;
          if (instText) {
            newObj[`${key}_past_installment`] = instText;
            newObj[`${key}_future_installment`] = instText;
          }
        } else {
          newObj[`${key}_future`] = numericVal;
          if (instText) newObj[`${key}_future_installment`] = instText;
        }
      });

      return newObj;
    });
  }, [data, sortedKeys, hiddenKeys]);

  // Cálculo mês a mês para os próximos 6 meses (valores que diminuirão ou aumentarão de parcelamentos)
  const sixMonthVariations = React.useMemo<SixMonthVariationPoint[]>(() => {
    if (data.length === 0 || currentMonthIdx < 0) return [];

    const getMonthTotal = (row: ChartRowData): number => {
      return sortedKeys.reduce((acc, key) => {
        if (hiddenKeys.has(key)) return acc;
        const val = row[key];
        return acc + (typeof val === "number" ? val : 0);
      }, 0);
    };

    const currentTotal = getMonthTotal(data[currentMonthIdx]);
    const points: SixMonthVariationPoint[] = [];

    for (let offset = 1; offset <= 6; offset++) {
      const targetIdx = currentMonthIdx + offset;
      if (targetIdx >= data.length) break;

      const prevRow = data[targetIdx - 1];
      const currRow = data[targetIdx];
      const prevTotal = getMonthTotal(prevRow);
      const total = getMonthTotal(currRow);

      let reliefAmount = 0;
      let increaseAmount = 0;
      const endingItems: MonthlyChangeItem[] = [];
      const startingItems: MonthlyChangeItem[] = [];

      sortedKeys.forEach((key) => {
        if (hiddenKeys.has(key)) return;
        const prevVal = typeof prevRow[key] === "number" ? Number(prevRow[key]) : 0;
        const currVal = typeof currRow[key] === "number" ? Number(currRow[key]) : 0;
        const diff = currVal - prevVal;

        if (diff < -0.005) {
          const drop = Math.abs(diff);
          reliefAmount += drop;
          endingItems.push({
            name: key,
            amount: drop,
            installment:
              typeof prevRow[`${key}_installment`] === "string"
                ? String(prevRow[`${key}_installment`])
                : undefined,
          });
        } else if (diff > 0.005) {
          increaseAmount += diff;
          startingItems.push({
            name: key,
            amount: diff,
            installment:
              typeof currRow[`${key}_installment`] === "string"
                ? String(currRow[`${key}_installment`])
                : undefined,
          });
        }
      });

      endingItems.sort((a, b) => b.amount - a.amount);
      startingItems.sort((a, b) => b.amount - a.amount);

      const monthStr = String(currRow.month);
      points.push({
        month: monthStr,
        shortMonth: formatShortMonth(monthStr),
        total,
        prevTotal,
        monthlyDelta: total - prevTotal,
        cumulativeDelta: total - currentTotal,
        reliefAmount,
        increaseAmount,
        endingItems,
        startingItems,
      });
    }

    return points;
  }, [data, currentMonthIdx, sortedKeys, hiddenKeys]);

  // Métricas de resumo no topo
  const summaryStats = React.useMemo(() => {
    if (data.length === 0 || currentMonthIdx < 0) {
      return {
        currentTotal: 0,
        activeInCurrentCount: 0,
        sixthMonthPoint: null as SixMonthVariationPoint | null,
        bestReliefPoint: null as SixMonthVariationPoint | null,
      };
    }

    const currRow = data[currentMonthIdx];
    let currentTotal = 0;
    let activeInCurrentCount = 0;

    sortedKeys.forEach((key) => {
      if (hiddenKeys.has(key)) return;
      const val = typeof currRow[key] === "number" ? Number(currRow[key]) : 0;
      if (val > 0) {
        currentTotal += val;
        activeInCurrentCount += 1;
      }
    });

    const sixthMonthPoint =
      sixMonthVariations.length > 0 ? sixMonthVariations[sixMonthVariations.length - 1] : null;

    let bestReliefPoint: SixMonthVariationPoint | null = null;
    for (const pt of sixMonthVariations) {
      if (pt.monthlyDelta < -0.005) {
        if (!bestReliefPoint || pt.monthlyDelta < bestReliefPoint.monthlyDelta) {
          bestReliefPoint = pt;
        }
      }
    }

    return {
      currentTotal,
      activeInCurrentCount,
      sixthMonthPoint,
      bestReliefPoint,
    };
  }, [data, currentMonthIdx, sortedKeys, hiddenKeys, sixMonthVariations]);

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

  if (data.length === 0 || keys.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-2xl p-4 text-center">
        Nenhuma despesa parcelada projetada para os próximos meses.
      </div>
    );
  }

  const boundaryShortMonth =
    currentMonthIdx >= 0 && transformedData[currentMonthIdx]
      ? String(transformedData[currentMonthIdx].shortMonth)
      : undefined;

  const displayedLegendMetas = showAllLegend ? sortedKeyMetas : sortedKeyMetas.slice(0, 8);
  const sixMonthNetDelta = summaryStats.sixthMonthPoint?.cumulativeDelta ?? 0;
  const sixMonthNetPercent =
    summaryStats.currentTotal > 0 ? (sixMonthNetDelta / summaryStats.currentTotal) * 100 : 0;

  const variationBarConfig: ChartConfig = {
    delta: {
      label: "Variação",
      color: "hsl(142, 71%, 45%)",
    },
  };

  return (
    <div className="@container space-y-6 w-full min-w-0">
      {/* 1. Resumo Executivo Compacto (Adaptável ao Mobile) */}
      <div className="grid grid-cols-2 @xl:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Card 1: Parcelas no Mês Atual */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate font-medium">Mês Atual ({boundaryShortMonth})</span>
            <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-sm sm:text-base font-extrabold text-foreground tabular-nums truncate">
              {formatCurrency(summaryStats.currentTotal)}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
              {summaryStats.activeInCurrentCount}{" "}
              {summaryStats.activeInCurrentCount === 1 ? "ativa" : "ativas"}
            </span>
          </div>
        </div>

        {/* Card 2: Projeção em 6 Meses */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate font-medium">
              Em 6 Meses ({summaryStats.sixthMonthPoint?.shortMonth ?? "—"})
            </span>
            <CalendarClock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-extrabold text-foreground tabular-nums truncate">
              {formatCurrency(summaryStats.sixthMonthPoint?.total ?? 0)}
            </span>
            {Math.abs(sixMonthNetDelta) > 0.01 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0 ${
                  sixMonthNetDelta < 0
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-rose-500/15 text-rose-400"
                }`}
              >
                {sixMonthNetDelta > 0 ? "+" : ""}
                {sixMonthNetPercent.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Alívio Acumulado em 6 Meses */}
        <div className="col-span-2 @xl:col-span-1 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-[11px] text-emerald-300/90">
            <span className="truncate font-semibold">
              {sixMonthNetDelta <= 0 ? "Alívio Previsto em 6 Meses" : "Variação Prevista em 6 Meses"}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
            <span
              className={`text-sm sm:text-base font-extrabold tabular-nums ${
                sixMonthNetDelta < 0
                  ? "text-emerald-400"
                  : sixMonthNetDelta > 0
                    ? "text-rose-400"
                    : "text-foreground"
              }`}
            >
              {sixMonthNetDelta < 0
                ? `-${formatCurrency(Math.abs(sixMonthNetDelta))}/mês`
                : sixMonthNetDelta > 0
                  ? `+${formatCurrency(sixMonthNetDelta)}/mês`
                  : "Estável"}
            </span>
            {summaryStats.bestReliefPoint && (
              <span className="text-[10px] text-emerald-300/90 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full font-medium truncate">
                Maior queda em {summaryStats.bestReliefPoint.shortMonth} (
                {formatCurrency(Math.abs(summaryStats.bestReliefPoint.monthlyDelta))})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Gráfico Principal de Camadas Empilhadas (Ordenado da maior duração na base para a menor no topo) */}
      <div className="rounded-2xl bg-black/20 border border-white/[0.06] p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            <span>
              <strong>Base → Topo:</strong> parcelamentos mais longos ficam na base
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-3.5 border-t border-dashed border-muted-foreground inline-block" />
              Histórico
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3.5 border-t-2 border-primary inline-block" />
              Projeção
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
                <linearGradient key={meta.key} id={`fill-inst-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={meta.color} stopOpacity={0.75} />
                  <stop offset="95%" stopColor={meta.color} stopOpacity={0.18} />
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
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="3 3"
              />
            )}
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.18)", strokeWidth: 1 }}
              content={<StackedChartTooltip hoveredKey={hoveredKey} showBalance={showBalance} />}
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
                    fill={`url(#fill-inst-${index})`}
                    strokeDasharray="4 4"
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
                    fill={`url(#fill-inst-${index})`}
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

        {/* Legenda Interativa Compacta & Responsiva (substitui os pontos sem texto do SVG) */}
        <div className="pt-2 border-t border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground font-medium">
              Parcelamentos ({visibleKeyMetas.length}/{sortedKeyMetas.length} visíveis) — toque para filtrar
            </span>
            <div className="flex items-center gap-1.5">
              {hiddenKeys.size > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setHiddenKeys(new Set())}
                  className="h-6 px-2 text-[11px] text-primary hover:text-primary"
                >
                  Mostrar todos
                </Button>
              )}
              {sortedKeyMetas.length > 8 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllLegend((prev) => !prev)}
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <span>{showAllLegend ? "Recolher" : `Ver todos (${sortedKeyMetas.length})`}</span>
                  {showAllLegend ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-1.5">
            {displayedLegendMetas.map((meta, idx) => {
              const isHidden = hiddenKeys.has(meta.key);
              const isHovered = hoveredKey === meta.key;

              return (
                <button
                  key={meta.key}
                  type="button"
                  onClick={() => toggleKey(meta.key)}
                  onMouseEnter={() => setHoveredKey(meta.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-left text-xs transition-all cursor-pointer min-w-0 ${
                    isHidden
                      ? "bg-white/[0.01] border-white/[0.04] opacity-40 line-through"
                      : isHovered
                        ? "bg-white/[0.08] border-white/20 shadow-sm"
                        : "bg-white/[0.025] border-white/[0.06] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="truncate font-medium text-foreground">{meta.key}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground bg-white/[0.04] px-1.5 py-0.5 rounded">
                      {idx === 0 ? "Base • " : ""}
                      {meta.endMonthLabel || meta.latestInstallmentLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Segundo Gráfico Logo Depois: Alívio e Variação Mês a Mês nos Próximos 6 Meses */}
      {sixMonthVariations.length > 0 && (
        <div className="rounded-2xl bg-black/20 border border-white/[0.06] p-3.5 sm:p-4 space-y-4">
          <div className="flex flex-col @lg:flex-row @lg:items-center justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    Alívio e Variação nos Próximos 6 Meses
                  </h3>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-semibold"
                  >
                    Mês a Mês
                  </Badge>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  Valores que diminuirão (alívio) ou aumentarão nas faturas de parcelamentos a cada mês
                </p>
              </div>
            </div>

            {/* Alternador entre Variação Mês a Mês vs Acumulado */}
            <div className="inline-flex items-center rounded-xl bg-white/[0.04] p-1 border border-white/[0.07] self-start @lg:self-center shrink-0">
              <button
                type="button"
                onClick={() => setVariationMode("monthly")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  variationMode === "monthly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                No Mês (vs. anterior)
              </button>
              <button
                type="button"
                onClick={() => setVariationMode("cumulative")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  variationMode === "cumulative"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Acumulado (vs. hoje)
              </button>
            </div>
          </div>

          {/* Gráfico de Barras dos Próximos 6 Meses */}
          <ChartContainer config={variationBarConfig} className="h-[180px] sm:h-[210px] w-full aspect-auto">
            <BarChart
              accessibilityLayer
              data={sixMonthVariations}
              margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="shortMonth"
                tickLine={false}
                tickMargin={8}
                axisLine={false}
                className="text-[10px] sm:text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompact}
                className="text-[10px] sm:text-xs"
                width={56}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={
                  <VariationChartTooltip
                    variationMode={variationMode}
                    showBalance={showBalance}
                  />
                }
              />
              <Bar
                dataKey={variationMode === "monthly" ? "monthlyDelta" : "cumulativeDelta"}
                radius={[6, 6, 6, 6]}
                maxBarSize={44}
              >
                {sixMonthVariations.map((entry) => {
                  const val =
                    variationMode === "monthly" ? entry.monthlyDelta : entry.cumulativeDelta;
                  const fill =
                    val < -0.005
                      ? "#10b981" // Verde Esmeralda para redução / alívio
                      : val > 0.005
                        ? "#f43f5e" // Rosa/Coral para aumento
                        : "rgba(255,255,255,0.2)";
                  return <Cell key={entry.month} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ChartContainer>

          {/* Cards Mês a Mês dos Próximos 6 Meses */}
          <div className="grid grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-6 gap-2">
            {sixMonthVariations.map((pt) => {
              const delta = variationMode === "monthly" ? pt.monthlyDelta : pt.cumulativeDelta;
              const isRelief = delta < -0.005;
              const isIncrease = delta > 0.005;

              return (
                <div
                  key={pt.month}
                  className={`rounded-xl p-2.5 border flex flex-col justify-between gap-1.5 min-w-0 transition-colors ${
                    isRelief
                      ? "bg-emerald-500/[0.06] border-emerald-500/20"
                      : isIncrease
                        ? "bg-rose-500/[0.06] border-rose-500/20"
                        : "bg-white/[0.02] border-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-foreground">{pt.shortMonth}</span>
                    {isRelief ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full">
                        <ArrowDownRight className="w-3 h-3" />
                        Alívio
                      </span>
                    ) : isIncrease ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded-full">
                        <ArrowUpRight className="w-3 h-3" />
                        Aumento
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-white/[0.05] px-1.5 py-0.5 rounded-full">
                        <Minus className="w-3 h-3" />
                        Mantém
                      </span>
                    )}
                  </div>

                  <div>
                    <div
                      className={`text-xs sm:text-sm font-extrabold tabular-nums truncate ${
                        isRelief
                          ? "text-emerald-400"
                          : isIncrease
                            ? "text-rose-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {isRelief
                        ? `-${formatCurrency(Math.abs(delta))}`
                        : isIncrease
                          ? `+${formatCurrency(delta)}`
                          : formatCurrency(0)}
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums truncate mt-0.5">
                      Total: {formatCurrency(pt.total)}
                    </div>
                  </div>

                  <div className="pt-1 border-t border-white/[0.06] text-[10px] text-muted-foreground truncate">
                    {pt.endingItems.length > 0 ? (
                      <span className="text-emerald-300/90 flex items-center gap-1 truncate">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          {pt.endingItems.length === 1
                            ? `Sai: ${pt.endingItems[0].name}`
                            : `${pt.endingItems.length} parcelas saem`}
                        </span>
                      </span>
                    ) : pt.startingItems.length > 0 ? (
                      <span className="text-rose-300/90 truncate">
                        +{pt.startingItems.length} nova(s)
                      </span>
                    ) : (
                      <span>Sem términos</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
