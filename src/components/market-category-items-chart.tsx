'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface MarketCategoryItemsChartProps {
  data: { category: string; value: number }[];
}

const chartConfig = {
  value: {
    label: 'Valor',
    color: 'var(--color-primary)',
  },
} satisfies ChartConfig;

export function MarketCategoryItemsChart({ data }: MarketCategoryItemsChartProps) {
  if (data.length === 0) {
    return (
      <Card className="rounded-[2rem] border-transparent shadow-sm flex flex-col h-full w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Volume por Categoria</CardTitle>
          <CardDescription>Valor total gasto</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center min-h-[250px]">
          <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[2rem] border-transparent shadow-sm flex flex-col h-full w-full min-w-0 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold">Volume por Categoria</CardTitle>
        <CardDescription>Valor total gasto por categoria</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px]">
        <ChartContainer config={chartConfig} className="h-full w-full min-h-[250px]">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" hide />
            <YAxis
              dataKey="category"
              type="category"
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              width={100}
              tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--color-muted)' }}
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(value as number)
                  }
                />
              }
            />
            <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} stroke="transparent" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
