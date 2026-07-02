'use client';

import { Pie, PieChart, Cell } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MarketCategoryChartProps {
  data: { category: string; value: number }[];
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
    maximumFractionDigits: 2,
  }).format(value);

export function MarketCategoryChart({ data }: MarketCategoryChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));

  const config = data.reduce((acc, item, index) => {
    acc[item.category] = {
      label: item.category,
      color: COLORS[index % COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  config.value = { label: 'Valor' };

  if (data.length === 0) {
    return (
      <Card className="rounded-[2rem] border-transparent shadow-sm flex flex-col h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Gastos por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center min-h-[250px]">
          <p className="text-sm text-muted-foreground">Nenhum dado disponível para este mês.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[2rem] border-transparent shadow-sm flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold">Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px]">
        <ChartContainer config={config} className="mx-auto aspect-square max-h-[300px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent nameKey="category" formatter={(value) => formatCurrency(Number(value))} hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="category"
              innerRadius={60}
              strokeWidth={5}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="category" />}
              className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
