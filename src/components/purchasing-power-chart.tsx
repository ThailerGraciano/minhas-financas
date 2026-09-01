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

interface PurchasingPowerChartProps {
  initialData: {
    accountName: string;
    income: number;
    expense: number;
    baseBalance: number;
  }[];
  competencyMonth: string;
}

const chartConfig = {
  baseBalance: {
    label: 'Saldo Base',
    color: '#3b82f6', // text-blue-500
  },
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

export function PurchasingPowerChart({ initialData, competencyMonth }: PurchasingPowerChartProps) {
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
        if (isMounted) setData(res.byAccount);
      });
    });
    return () => { isMounted = false; };
  }, [showOnlyPaid, competencyMonth]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-none sm:rounded-[2rem] px-4 py-6 sm:p-6 border-transparent shadow-sm flex items-center justify-center h-[260px] text-sm text-muted-foreground w-full min-w-0">
        Nenhuma conta cadastrada para exibir o gráfico.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-none sm:rounded-[2rem] px-4 py-6 sm:p-6 border-transparent shadow-sm w-full min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Poder de Compra (Saldo + Receita vs Despesa)</h2>
        <div className="flex items-center space-x-2">
          <Switch id="purchasing-power-paid" checked={showOnlyPaid} onCheckedChange={setShowOnlyPaid} />
          <Label htmlFor="purchasing-power-paid" className="text-xs text-muted-foreground">Apenas efetivados</Label>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="min-h-[260px] w-full" style={{ opacity: isPending ? 0.6 : 1 }}>
        <BarChart accessibilityLayer data={data} margin={{ top: 12, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="accountName"
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
          
          {/* Empilhados no stackId "positivo" */}
          <Bar dataKey="baseBalance" stackId="positivo" name="baseBalance" fill="var(--color-baseBalance)" radius={[0, 0, 0, 0]} stroke="transparent" />
          <Bar dataKey="income" stackId="positivo" name="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} stroke="transparent" />
          
          {/* Despesa em barra separada (sem stackId, ou stackId diferente) */}
          <Bar dataKey="expense" name="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} stroke="transparent" />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
