"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

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
} satisfies ChartConfig

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
};

const CustomTooltip = ({ active, payload, label, hoveredKey }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const isFuture = Boolean(payload[0]?.payload?.isFuture);

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

export function ExpensesForecastChart({
  data,
}: {
  data: Record<string, unknown>[];
}) {
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
        Nenhum dado disponível.
      </div>
    )
  }

  const keys = ["Variáveis", "Fixas", "Parcelas"];

  return (
    <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
      <AreaChart accessibilityLayer data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
        <defs>
          {keys.map((key, index) => {
            const color = chartConfig[key as keyof typeof chartConfig]?.color;
            return (
              <linearGradient
                key={key}
                id={`fill-forecast-${index}`}
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
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
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
        <ChartLegend content={<ChartLegendContent />} />
        
        {keys.map((key, index) => {
          const color = chartConfig[key as keyof typeof chartConfig]?.color;
          return (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="a"
              stroke={color}
              fill={`url(#fill-forecast-${index})`}
              opacity={hoveredKey ? (hoveredKey === key ? 1 : 0.2) : 1}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{ transition: 'opacity 0.2s ease-in-out', cursor: 'pointer' }}
            />
          );
        })}
      </AreaChart>
    </ChartContainer>
  )
}
