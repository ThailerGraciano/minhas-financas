'use client';

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface PlanningChartProps {
  data: {
    date: string;
    projected_balance: number;
  }[];
}

const chartConfig = {
  projected_balance: {
    label: "Saldo Previsto",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function PlanningChart({ data }: PlanningChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    formattedDate: format(parseISO(item.date), "dd/MM", { locale: ptBR }),
  }));

  const minBalance = Math.min(...data.map((d) => d.projected_balance));
  const maxBalance = Math.max(...data.map((d) => d.projected_balance));

  // Add some padding to Y axis, ensure it doesn't collapse if everything is 0
  const yDomain = [
    minBalance < 0 ? Math.floor(minBalance * 1.1) : 0,
    maxBalance === 0 && minBalance === 0 ? 100 : Math.ceil(maxBalance * 1.1),
  ];

  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full mt-4">
      <AreaChart accessibilityLayer data={formattedData} margin={{ top: 10, left: -10, right: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorBalancePlanning" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="formattedDate"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={30}
          className="text-xs"
        />
        <YAxis 
          tickLine={false} 
          axisLine={false} 
          tickMargin={4}
          domain={yDomain}
          tickFormatter={(value) => {
            if (value === 0) return "R$ 0";
            return `R$ ${Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`;
          }}
          className="text-xs"
          width={55}
        />
        <ChartTooltip
          cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Area
          type="monotone"
          dataKey="projected_balance"
          stroke="var(--color-projected_balance)"
          strokeWidth={3}
          fill="url(#colorBalancePlanning)"
          dot={false}
          activeDot={{ r: 6, fill: "var(--color-projected_balance)" }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
