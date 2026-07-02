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
  data: { category: string; count: number }[];
}

const chartConfig = {
  count: {
    label: 'Quantidade',
    color: 'var(--color-primary)',
  },
} satisfies ChartConfig;

export function MarketCategoryItemsChart({ data }: MarketCategoryItemsChartProps) {
  if (data.length === 0) {
    return (
      <Card className="rounded-[2rem] border-transparent shadow-sm flex flex-col h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Volume por Categoria</CardTitle>
          <CardDescription>Qtd. de produtos comprados</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center min-h-[250px]">
          <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
        </CardContent>
      </Card>
    );
  }

  // Only show top 7 categories by volume to avoid clutter
  const chartData = data.slice(0, 7);

  return (
    <Card className="rounded-[2rem] border-transparent shadow-sm flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold">Volume por Categoria</CardTitle>
        <CardDescription>Top 7 em qtd. de produtos</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px]">
        <ChartContainer config={chartConfig} className="h-full w-full min-h-[250px]">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" />
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
              content={<ChartTooltipContent />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
