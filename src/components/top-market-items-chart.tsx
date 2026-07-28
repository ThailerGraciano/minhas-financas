'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TopMarketItemsChartProps {
  data: {
    description: string;
    netPrice: number;
    quantity: number;
    unitMeasure: string;
  }[];
}

const formatCurrencyCompact = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value);

const chartConfig = {
  netPrice: {
    label: 'Total (R$)',
    color: 'var(--color-primary)',
  },
} satisfies ChartConfig;

export function TopMarketItemsChart({ data }: TopMarketItemsChartProps) {
  const chartData = data.map(item => ({
    ...item,
    shortDescription: item.description.length > 20 ? item.description.substring(0, 20) + '...' : item.description,
  }));

  if (data.length === 0) {
    return (
      <Card className="rounded-[2rem] border-transparent shadow-sm flex flex-col h-full w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Produtos Mais Caros</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center min-h-[250px]">
          <p className="text-sm text-muted-foreground">Nenhum dado disponível para este mês.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[2rem] border-transparent shadow-sm flex flex-col h-full w-full min-w-0 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold">Produtos Mais Caros</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px]">
        <ChartContainer config={chartConfig} className="w-full h-full min-h-[260px]">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrencyCompact}
              className="text-xs"
            />
            <YAxis
              dataKey="shortDescription"
              type="category"
              tickLine={false}
              axisLine={false}
              className="text-xs"
              width={100}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => (
                    <>
                      <div className="font-medium">{formatCurrency(Number(value))}</div>
                      <div className="text-xs text-muted-foreground ml-2">
                        ({item.payload.quantity} {item.payload.unitMeasure})
                      </div>
                    </>
                  )}
                />
              }
            />
            <Bar dataKey="netPrice" fill="var(--color-netPrice)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
