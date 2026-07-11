'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMemo } from 'react';

interface MarketCategoryHistoryChartProps {
  data: Record<string, string | number>[];
}

const COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0, // Using 0 fraction digits for cleaner Y axis
  }).format(value);

export function MarketCategoryHistoryChart({ data }: MarketCategoryHistoryChartProps) {
  // Extract all unique categories across all months
  const categories = useMemo(() => {
    const cats = new Set<string>();
    data.forEach(monthData => {
      Object.keys(monthData).forEach(key => {
        if (key !== 'month') cats.add(key);
      });
    });
    return Array.from(cats);
  }, [data]);

  const config = useMemo(() => {
    return categories.reduce((acc, cat, index) => {
      acc[cat] = {
        label: cat,
        color: COLORS[index % COLORS.length],
      };
      return acc;
    }, {} as ChartConfig);
  }, [categories]);

  if (data.length === 0 || categories.length === 0) {
    return (
      <Card className="rounded-[2rem] border-transparent shadow-sm flex flex-col h-full w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Evolução por Categoria</CardTitle>
          <CardDescription>Últimos 3 meses</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center min-h-[250px]">
          <p className="text-sm text-muted-foreground">Nenhum dado disponível para o período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[2rem] border-transparent shadow-sm flex flex-col h-full w-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold">Evolução por Categoria</CardTitle>
        <CardDescription>Últimos 3 meses</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px]">
        <ChartContainer config={config} className="h-full w-full min-h-[250px]">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              {categories.map((cat, index) => (
                <linearGradient key={cat} id={`fill${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
            />
            {categories.map((cat, index) => (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                stackId="1"
                stroke={COLORS[index % COLORS.length]}
                fill={`url(#fill${index})`}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} className="mt-4" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
