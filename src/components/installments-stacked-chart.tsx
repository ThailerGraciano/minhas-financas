"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

const COLORS = [
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
  payload: Record<string, string | number>;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  hoveredKey?: string | null;
};

const CustomTooltip = ({ active, payload, label, hoveredKey }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border text-popover-foreground rounded-lg shadow-md p-3 min-w-[200px]">
        <div className="font-semibold mb-2 border-b pb-1">{label}</div>
        <div className="flex flex-col gap-1.5">
          {payload.map((entry: TooltipPayload, index: number) => {
            const installmentText = entry.payload[`${entry.dataKey}_installment`];
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
                    {entry.dataKey} {installmentText ? ` ${installmentText}` : ''}
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
};

export function InstallmentsStackedChart({
  data,
  keys,
}: {
  data: Record<string, string | number>[];
  keys: string[];
}) {
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);

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

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
        Nenhuma despesa parcelada projetada para os próximos meses.
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis 
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `R$ ${value}`}
          width={80}
        />
        <ChartTooltip 
          cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
          content={<CustomTooltip hoveredKey={hoveredKey} />} 
        />
        <ChartLegend content={<ChartLegendContent />} />
        {keys.map((key) => {
          return (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={chartConfig[key]?.color || '#000000'}
              opacity={hoveredKey ? (hoveredKey === key ? 1 : 0.2) : 1}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{ transition: 'opacity 0.2s ease-in-out', cursor: 'pointer' }}
            />
          );
        })}
      </BarChart>
    </ChartContainer>
  )
}
