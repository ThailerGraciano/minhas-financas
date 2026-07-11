'use client';

import { useState, useEffect, useTransition } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getIncomeVsExpenseData } from '@/app/actions/dashboard';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

interface GlobalIncomeExpenseChartProps {
  initialData: {
    name: string;
    income: number;
    expense: number;
  };
  competencyMonth: string;
}

const chartConfig = {
  income: {
    label: 'Receitas',
    color: '#22c55e', // text-green-500
  },
  expense: {
    label: 'Despesas',
    color: '#ef4444', // text-red-500
  },
} satisfies ChartConfig;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value);

const formatCurrencyCompact = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

export function GlobalIncomeExpenseChart({ initialData, competencyMonth }: GlobalIncomeExpenseChartProps) {
  const [showOnlyPaid, setShowOnlyPaid] = useState(false);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(initialData);
    setShowOnlyPaid(false);
  }, [initialData]);

  useEffect(() => {
    let isMounted = true;
    startTransition(() => {
      getIncomeVsExpenseData(competencyMonth, showOnlyPaid).then(res => {
        if (isMounted) setData(res.global);
      });
    });
    return () => { isMounted = false; };
  }, [showOnlyPaid, competencyMonth]);

  const chartData = [data];

  return (
    <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Comparativo Geral</h2>
        <div className="flex items-center space-x-2">
          <Switch id="global-paid" checked={showOnlyPaid} onCheckedChange={setShowOnlyPaid} />
          <Label htmlFor="global-paid" className="text-xs text-muted-foreground">Apenas efetivados</Label>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="min-h-[260px] w-full" style={{ opacity: isPending ? 0.6 : 1 }}>
        <BarChart accessibilityLayer data={chartData} margin={{ top: 12, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-xs"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={formatCurrencyCompact}
            className="text-xs"
            width={72}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrency(Number(value))}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="income" name="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
