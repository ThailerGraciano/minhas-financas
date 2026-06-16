"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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

export function InstallmentsStackedChart({
  data,
  keys,
}: {
  data: any[];
  keys: string[];
}) {
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
          content={<ChartTooltipContent hideLabel={false} valueFormatter={(val) => `R$ ${Number(val).toFixed(2)}`} />} 
        />
        <ChartLegend content={<ChartLegendContent />} />
        {keys.map((key) => {
          return (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={chartConfig[key]?.color || '#000000'}
            />
          );
        })}
      </BarChart>
    </ChartContainer>
  )
}
