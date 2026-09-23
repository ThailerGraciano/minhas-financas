"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

const BASE_COLORS = [
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#eab308", // yellow-500
  "#a855f7", // purple-500
  "#22c55e", // green-500
  "#f97316", // orange-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#8b5cf6", // violet-500
  "#14b8a6", // teal-500
  "#f43f5e", // rose-500
  "#84cc16", // lime-500
  "#6366f1", // indigo-500
  "#0ea5e9", // sky-500
  "#10b981", // emerald-500
  "#d946ef", // fuchsia-500
];

type TooltipPayload = {
  dataKey: string;
  name?: string;
  value: number;
  color?: string;
  fill?: string;
  payload: Record<string, string | number | boolean>;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  hoveredKey?: string | null;
  showBalance?: boolean;
};

const CustomTooltip = ({ active, payload, label, hoveredKey, showBalance = true }: CustomTooltipProps) => {
  const formatCurrency = (val: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  if (active && payload && payload.length) {
    const isFuture = payload[0]?.payload?.isFuture;
    const totalVal = payload.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

    return (
      <div className="bg-popover border border-white/10 text-popover-foreground rounded-2xl shadow-xl p-3 min-w-[210px] space-y-2">
        <div className="font-semibold text-xs border-b border-white/5 pb-1 flex justify-between items-center">
          <span>{label}</span>
          {isFuture && (
            <Badge
              variant="outline"
              className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 px-2 py-0.5 rounded-full"
            >
              Previsão
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
          {payload.map((entry: TooltipPayload, index: number) => {
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
                    {entry.dataKey}
                  </span>
                </div>
                <span className="font-bold ml-auto tabular-nums">{formatCurrency(Number(entry.value))}</span>
              </div>
            );
          })}
        </div>
        {payload.length > 1 && (
          <div className="border-t border-white/5 pt-1.5 flex justify-between text-xs font-bold">
            <span>Total:</span>
            <span className="text-primary">{formatCurrency(totalVal)}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function CategoryForecastChart({
  data,
  keys,
  showBalance = true,
}: {
  data: Record<string, string | number | boolean>[];
  keys: string[];
  showBalance?: boolean;
}) {
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);
  const [hiddenKeys, setHiddenKeys] = React.useState<Set<string>>(new Set());

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    keys.forEach((key, index) => {
      config[key] = {
        label: key,
        color: BASE_COLORS[index % BASE_COLORS.length],
      };
    });
    return config;
  }, [keys]);

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
  const hideAll = () => setHiddenKeys(new Set(keys));

  const visibleKeys = keys.filter((k) => !hiddenKeys.has(k));

  if (data.length === 0 || keys.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
        Nenhum dado disponível.
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
    <div className="w-full space-y-4">
      {/* Controles da Legenda Interativa */}
      {keys.length > 6 && (
        <div className="flex justify-end gap-2 text-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={showAll}
            className="text-[11px] h-7 px-2.5 text-muted-foreground hover:text-foreground"
          >
            Mostrar todas
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={hideAll}
            className="text-[11px] h-7 px-2.5 text-muted-foreground hover:text-foreground"
          >
            Ocultar todas
          </Button>
        </div>
      )}

      <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
        <AreaChart accessibilityLayer data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <defs>
            {visibleKeys.map((key, index) => {
              const color = chartConfig[key]?.color;
              return (
                <linearGradient key={key} id={`fill-cat-${index}`} x1="0" y1="0" x2="0" y2="1">
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

          {visibleKeys.map((key, index) => {
            const color = chartConfig[key]?.color;
            return (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="a"
                stroke={color}
                fill={`url(#fill-cat-${index})`}
                opacity={hoveredKey ? (hoveredKey === key ? 1 : 0.2) : 1}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                style={{ transition: "opacity 0.2s ease-in-out", cursor: "pointer" }}
              />
            );
          })}
        </AreaChart>
      </ChartContainer>

      {/* Legenda Interativa Clicável */}
      <div className="mt-3 max-h-[130px] overflow-y-auto px-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
          {keys.map((key, index) => {
            const color = BASE_COLORS[index % BASE_COLORS.length];
            const isHidden = hiddenKeys.has(key);
            const isHovered = hoveredKey === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleKey(key)}
                className={`flex items-center gap-1.5 text-xs transition-all duration-200 cursor-pointer ${
                  isHidden
                    ? "opacity-30 line-through text-muted-foreground"
                    : isHovered
                      ? "opacity-100 font-semibold"
                      : "opacity-85 hover:opacity-100"
                }`}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                title={isHidden ? "Clique para exibir" : "Clique para ocultar"}
              >
                <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-muted-foreground whitespace-nowrap">{key}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
