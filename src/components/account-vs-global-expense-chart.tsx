'use client';

import { useState, useEffect, useTransition } from 'react';
import { Bar, ComposedChart, CartesianGrid, Line, XAxis, YAxis } from 'recharts';
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

interface AccountVsGlobalExpenseChartProps {
  initialData: {
    accountName: string;
    income: number;
    globalExpense: number;
  }[];
  competencyMonth: string;
}

const chartConfig = {
  income: {
    label: 'Receitas da Conta',
    color: '#22c55e', // text-green-500
  },
  globalExpense: {
    label: 'Despesa Global',
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

export function AccountVsGlobalExpenseChart({ initialData, competencyMonth }: AccountVsGlobalExpenseChartProps) {
  const [showOnlyPaid, setShowOnlyPaid] = useState(false);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setData(initialData);
    setShowOnlyPaid(false);
  }, [initialData]);

  useEffect(() => {
    let isMounted = true;
    startTransition(() => {
      getIncomeVsExpenseData(competencyMonth, showOnlyPaid).then(res => {
        if (isMounted) setData(res.accountVsGlobal);
      });
    });
    return () => { isMounted = false; };
  }, [showOnlyPaid, competencyMonth]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm flex items-center justify-center h-[260px] text-sm text-muted-foreground">
        Nenhuma conta cadastrada para exibir o gráfico.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Poder de Pagamento (Receitas vs Despesa Global)</h2>
        <div className="flex items-center space-x-2">
          <Switch id="account-vs-global-paid" checked={showOnlyPaid} onCheckedChange={setShowOnlyPaid} />
          <Label htmlFor="account-vs-global-paid" className="text-xs text-muted-foreground">Apenas efetivados</Label>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="min-h-[260px] w-full" style={{ opacity: isPending ? 0.6 : 1 }}>
        <ComposedChart accessibilityLayer data={data} margin={{ top: 12, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
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
          <Bar dataKey="income" name="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={60} />
          <Line 
            type="monotone" 
            dataKey="globalExpense" 
            name="globalExpense" 
            stroke="var(--color-globalExpense)" 
            strokeWidth={3} 
            dot={false}
            activeDot={{ r: 6, fill: 'var(--color-globalExpense)' }}
            strokeDasharray="5 5"
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
