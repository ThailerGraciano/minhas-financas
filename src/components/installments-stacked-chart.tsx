"use client";

import { Badge } from "@/components/ui/badge";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Sparkles } from "lucide-react";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = [
  "hsl(24, 100%, 50%)", // Laranja padrão do tema
  "hsl(217, 91%, 60%)", // Azul (Blue)
  "hsl(142, 71%, 45%)", // Verde (Green)
  "hsl(283, 39%, 53%)", // Roxo (Purple)
  "hsl(346, 87%, 61%)", // Rosa (Pink)
  "hsl(175, 77%, 41%)", // Turquesa (Teal)
  "hsl(43, 100%, 50%)", // Amarelo (Amber)
  "hsl(0, 84%, 60%)", // Vermelho (Red)
  "hsl(230, 80%, 65%)", // Indigo (Indigo)
  "hsl(15, 80%, 50%)", // Laranja Vibrante
  "hsl(100, 60%, 50%)", // Verde Limão
];

type TooltipPayload = {
  dataKey: string;
  name?: string;
  value: number;
  color?: string;
  fill?: string;
  payload: Record<string, string | number>;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  hoveredKey?: string | null;
  showBalance?: boolean;
};

type ExtendedTooltipPayload = TooltipPayload & { originalDataKey: string };

const CustomTooltip = ({ active, payload, label, hoveredKey, showBalance = true }: CustomTooltipProps) => {
  const formatCurrency = (value: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  if (active && payload && payload.length) {
    const uniqueEntries = payload.reduce((acc: ExtendedTooltipPayload[], entry: TooltipPayload) => {
      const baseKey = entry.dataKey.replace(/(_past|_future)$/, "");
      if (!acc.find((item) => item.dataKey === baseKey)) {
        acc.push({
          ...entry,
          originalDataKey: entry.dataKey,
          dataKey: baseKey,
        });
      }
      return acc;
    }, []);

    const totalVal = uniqueEntries.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

    return (
      <div className="bg-popover border border-white/10 text-popover-foreground rounded-2xl shadow-xl p-3 min-w-[220px] space-y-2">
        <div className="font-semibold text-xs border-b border-white/5 pb-1 flex justify-between items-center">
          <span>{label}</span>
          <span className="text-[10px] text-muted-foreground">Fatura do Mês</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {uniqueEntries.map((entry: ExtendedTooltipPayload, index: number) => {
            const installmentText = entry.payload[`${entry.originalDataKey}_installment`];
            const isHovered = hoveredKey === entry.dataKey;
            const isDimmed = hoveredKey && !isHovered;

            return (
              <div
                key={index}
                className={`flex items-center justify-between text-xs transition-opacity duration-200 ${
                  isDimmed ? "opacity-30" : "opacity-100"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color || entry.fill }}
                  />
                  <span className={`font-medium truncate ${isHovered ? "text-foreground" : "text-muted-foreground"}`}>
                    {entry.dataKey} {installmentText ? `(${installmentText})` : ""}
                  </span>
                </div>
                <span className="font-bold ml-auto shrink-0 tabular-nums">{formatCurrency(Number(entry.value))}</span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/5 pt-1.5 flex justify-between text-xs font-bold">
          <span>Total de parcelas:</span>
          <span className="text-primary">{formatCurrency(totalVal)}</span>
        </div>
      </div>
    );
  }
  return null;
};

function calculateFutureRelief(data: Record<string, string | number | boolean>[], keys: string[]) {
  if (!data || data.length === 0) return null;

  const monthlySums = data.map((d) => {
    let sum = 0;
    keys.forEach((k) => {
      const val = d[k];
      if (typeof val === "number") sum += val;
    });
    return { month: String(d.month), isPast: Boolean(d.isPast), sum };
  });

  const currentMonthIdx = monthlySums.findIndex((d) => !d.isPast);
  if (currentMonthIdx === -1) return null;

  const currentSum = monthlySums[currentMonthIdx].sum;
  if (currentSum <= 0) return null;

  for (let i = currentMonthIdx + 1; i < monthlySums.length; i++) {
    const futurePoint = monthlySums[i];
    const diff = currentSum - futurePoint.sum;
    if (diff >= 100 && diff / currentSum >= 0.2) {
      return {
        month: futurePoint.month,
        reliefAmount: diff,
        percent: (diff / currentSum) * 100,
      };
    }
  }

  return null;
}

export function InstallmentsStackedChart({
  data,
  keys,
  showBalance = true,
}: {
  data: Record<string, string | number | boolean>[];
  keys: string[];
  showBalance?: boolean;
}) {
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);

  const formatCurrency = (value: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  // Configura o chart dinamicamente com as chaves reais
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    keys.forEach((key, index) => {
      config[key] = {
        label: key,
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [keys]);

  // Transforma os dados dividindo entre passado e futuro para o efeito pontilhado
  const transformedData = React.useMemo(() => {
    return data.map((d, index) => {
      const isPast = Boolean(d.isPast);
      const isBoundary = !isPast && (index === 0 || Boolean(data[index - 1].isPast));

      const newObj: Record<string, string | number | boolean> = { month: String(d.month), isPast: isPast };
      keys.forEach((key) => {
        const val = d[key];
        const instText = d[`${key}_installment`];

        if (val !== undefined) {
          if (isPast) {
            newObj[`${key}_past`] = val;
            if (instText) newObj[`${key}_past_installment`] = instText;
          } else if (isBoundary) {
            newObj[`${key}_past`] = val;
            newObj[`${key}_future`] = val;
            if (instText) {
              newObj[`${key}_past_installment`] = instText;
              newObj[`${key}_future_installment`] = instText;
            }
          } else {
            newObj[`${key}_future`] = val;
            if (instText) newObj[`${key}_future_installment`] = instText;
          }
        }
      });
      return newObj;
    });
  }, [data, keys]);

  const futureRelief = calculateFutureRelief(data, keys);

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
        Nenhuma despesa parcelada projetada para os próximos meses.
      </div>
    );
  }

  const formatCompact = (val: number) => {
    if (!showBalance) return "••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(val);
  };

  return (
    <div className="space-y-4">
      {/* Alerta Visual: Parcelamentos Terminando */}
      {futureRelief && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-emerald-300 font-medium">
              <strong>Parcelamentos terminando:</strong> alívio previsto de{" "}
              <strong className="text-foreground">{formatCurrency(futureRelief.reliefAmount)}</strong> (
              {futureRelief.percent.toFixed(0)}%) em <strong>{futureRelief.month}</strong>!
            </span>
          </div>
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 bg-emerald-500/20 text-[10px] font-bold"
          >
            Alívio de Orçamento
          </Badge>
        </div>
      )}

      <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
        <AreaChart accessibilityLayer data={transformedData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <defs>
            {keys.map((key, index) => {
              const color = chartConfig[key]?.color || `hsl(${index * 40}, 70%, 50%)`;
              return (
                <linearGradient key={key} id={`fill-inst-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} className="text-xs" />
          <YAxis tickLine={false} axisLine={false} tickFormatter={formatCompact} className="text-xs" width={80} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.1 }}
            content={<CustomTooltip hoveredKey={hoveredKey} showBalance={showBalance} />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          {keys.map((key, index) => {
            const color = chartConfig[key]?.color || COLORS[index % COLORS.length];
            const isFaded = hoveredKey && hoveredKey !== key;
            const opacity = isFaded ? 0.2 : 1;

            return (
              <React.Fragment key={key}>
                <Area
                  type="monotone"
                  dataKey={`${key}_past`}
                  stackId="past"
                  stroke={color}
                  fill={`url(#fill-inst-${index})`}
                  strokeDasharray="5 5"
                  opacity={opacity}
                  onMouseEnter={() => setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  style={{ transition: "opacity 0.2s ease-in-out", cursor: "pointer" }}
                />
                <Area
                  type="monotone"
                  dataKey={`${key}_future`}
                  stackId="future"
                  stroke={color}
                  fill={`url(#fill-inst-${index})`}
                  opacity={opacity}
                  onMouseEnter={() => setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  style={{ transition: "opacity 0.2s ease-in-out", cursor: "pointer" }}
                />
              </React.Fragment>
            );
          })}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
