"use client";

import { Badge } from "@/components/ui/badge";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";

const chartConfig = {
  Parcelas: {
    label: "Parcelas",
    color: "#3b82f6", // blue
  },
  Fixas: {
    label: "Fixas",
    color: "#eab308", // yellow
  },
  Variáveis: {
    label: "Variáveis",
    color: "#22c55e", // green
  },
} satisfies ChartConfig;

type TooltipPayload = {
  dataKey: string;
  name?: string;
  value: number;
  color?: string;
  fill?: string;
  payload: Record<string, unknown>;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  hoveredKey?: string | null;
  showBalance?: boolean;
};

const CustomTooltip = ({ active, payload, label, hoveredKey, showBalance = true }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const isFuture = Boolean(payload[0]?.payload?.isFuture);
    const formatCurrency = (val: number) => {
      if (!showBalance) return "••••••";
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
    };

    const totalVal = payload.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

    return (
      <div className="bg-popover border border-white/10 text-popover-foreground rounded-2xl shadow-xl p-3 min-w-[210px] space-y-2">
        <div className="font-semibold text-xs border-b border-white/5 pb-1.5 flex justify-between items-center">
          <span>{label}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              isFuture
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            )}
          >
            {isFuture ? "Previsão" : "Realizado"}
          </Badge>
        </div>

        <div className="flex flex-col gap-1.5">
          {payload.map((entry: TooltipPayload, index: number) => {
            const isHovered = hoveredKey === entry.dataKey;
            const isDimmed = hoveredKey && !isHovered;
            const percent = totalVal > 0 ? ((Number(entry.value) / totalVal) * 100).toFixed(0) : 0;

            return (
              <div
                key={index}
                className={`flex items-center justify-between text-xs transition-opacity duration-200 ${
                  isDimmed ? "opacity-30" : "opacity-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color || entry.fill }}
                  />
                  <span className={`font-medium ${isHovered ? "text-foreground" : "text-muted-foreground"}`}>
                    {entry.dataKey}:
                  </span>
                </div>
                <span className="font-bold ml-2">
                  {formatCurrency(Number(entry.value))} {payload.length > 1 ? `(${percent}%)` : ""}
                </span>
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

export function ExpensesForecastChart({
  data,
  showBalance = true,
}: {
  data: Record<string, unknown>[];
  showBalance?: boolean;
}) {
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("todas");

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
        Nenhum dado disponível.
      </div>
    );
  }

  const allKeys = ["Variáveis", "Fixas", "Parcelas"];
  const keys = activeTab === "todas" ? allKeys : [activeTab];
  const isStacked = activeTab === "todas";

  // Identifica o ponto de junção "Hoje" (último mês não futuro)
  const currentMonthPoint = data.find((d, idx) => {
    const next = data[idx + 1];
    return !d.isFuture && (next ? Boolean(next.isFuture) : true);
  });
  const currentMonthLabel = currentMonthPoint ? String(currentMonthPoint.month) : undefined;

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
    <div className="flex flex-col space-y-6">
      <Tabs defaultValue="todas" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-full p-1 bg-white/5">
          <TabsTrigger
            value="todas"
            className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
          >
            Todas
          </TabsTrigger>
          <TabsTrigger
            value="Fixas"
            className="rounded-full data-[state=active]:bg-[#eab308] data-[state=active]:text-white text-xs"
          >
            Fixas
          </TabsTrigger>
          <TabsTrigger
            value="Parcelas"
            className="rounded-full data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white text-xs"
          >
            Parcelas
          </TabsTrigger>
          <TabsTrigger
            value="Variáveis"
            className="rounded-full data-[state=active]:bg-[#22c55e] data-[state=active]:text-white text-xs"
          >
            Variáveis
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
        <AreaChart accessibilityLayer data={data} margin={{ top: 20, right: 16, left: -16, bottom: 0 }}>
          <defs>
            {keys.map((key, index) => {
              const color = chartConfig[key as keyof typeof chartConfig]?.color;
              return (
                <linearGradient key={key} id={`fill-forecast-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              );
            })}
          </defs>

          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />

          <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} className="text-xs" />

          <YAxis tickLine={false} axisLine={false} tickFormatter={formatCompact} className="text-xs" width={75} />

          {/* Marcação "Hoje" separando histórico e projeção */}
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

          <Tooltip content={<CustomTooltip hoveredKey={hoveredKey} showBalance={showBalance} />} />

          {isStacked
            ? // Composição Empilhada quando "Todas" selecionado
              keys.map((key, index) => {
                const color = chartConfig[key as keyof typeof chartConfig]?.color;
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="a"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#fill-forecast-${index})`}
                    opacity={hoveredKey ? (hoveredKey === key ? 1 : 0.2) : 1}
                    onMouseEnter={() => setHoveredKey(key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    style={{ transition: "opacity 0.2s ease-in-out", cursor: "pointer" }}
                  />
                );
              })
            : // Evolução destacada quando categoria individual selecionada
              keys.map((key, index) => {
                const color = chartConfig[key as keyof typeof chartConfig]?.color;
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={3.5}
                    fill={`url(#fill-forecast-${index})`}
                    dot={{ r: 3, fill: color }}
                    activeDot={{ r: 6, fill: color, stroke: "var(--background)", strokeWidth: 2 }}
                  />
                );
              })}
        </AreaChart>
      </ChartContainer>

      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#eab308]" />
          <span>Fixas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
          <span>Variáveis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#3b82f6]" />
          <span>Parceladas</span>
        </div>
      </div>
    </div>
  );
}
