"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"

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
};

const CustomTooltip = ({ active, payload, label, hoveredKey }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const isFuture = payload[0]?.payload?.isFuture;

    return (
      <div className="bg-popover border text-popover-foreground rounded-lg shadow-md p-3 min-w-[200px]">
        <div className="font-semibold mb-2 border-b pb-1 flex justify-between items-center">
          <span>{label}</span>
          {isFuture && <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase tracking-wider">Previsão</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          {payload.map((entry: TooltipPayload, index: number) => {
            const isHovered = hoveredKey === entry.dataKey;
            const isDimmed = hoveredKey && !isHovered;
            
            return (
              <div 
                key={index} 
                className={`flex items-center justify-between text-sm transition-opacity duration-200 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
                  <span className={`font-medium ${isHovered ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {entry.dataKey}
                  </span>
                </div>
                <span className="font-bold ml-4">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

export function CategoryForecastChart({
  data,
  keys,
}: {
  data: Record<string, string | number | boolean>[];
  keys: string[];
}) {
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);

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

  if (data.length === 0 || keys.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
        Nenhum dado disponível.
      </div>
    )
  }

  return (
    <div className="w-full">
      <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
        <AreaChart accessibilityLayer data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <defs>
            {keys.map((key, index) => {
              const color = chartConfig[key]?.color;
              return (
                <linearGradient
                  key={key}
                  id={`fill-category-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis 
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                notation: "compact",
            }).format(value)}
            width={80}
          />
          <ChartTooltip 
            cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
            content={<CustomTooltip hoveredKey={hoveredKey} />} 
          />
          
          {keys.map((key, index) => {
            const color = chartConfig[key]?.color;
            return (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="a"
                stroke={color}
                fill={`url(#fill-category-${index})`}
                opacity={hoveredKey ? (hoveredKey === key ? 1 : 0.2) : 1}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                style={{ transition: 'opacity 0.2s ease-in-out', cursor: 'pointer' }}
              />
            );
          })}
        </AreaChart>
      </ChartContainer>

      {/* Legenda externa ao gráfico */}
      <div className="mt-3 max-h-[120px] overflow-y-auto px-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
          {keys.map((key, index) => {
            const color = BASE_COLORS[index % BASE_COLORS.length];
            const isHovered = hoveredKey === key;
            const isDimmed = hoveredKey && !isHovered;
            return (
              <button
                key={key}
                type="button"
                className={`flex items-center gap-1.5 text-xs transition-opacity duration-200 cursor-pointer hover:opacity-100 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground whitespace-nowrap">{key}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  )
}
