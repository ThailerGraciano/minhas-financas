'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { BalanceEvolutionPoint } from '@/app/actions/dashboard';

interface BalanceEvolutionChartProps {
  data: BalanceEvolutionPoint[];
}

// Cores hardcoded para garantir visibilidade independente do tema monocromático.
// O tema deste projeto usa --chart-* em escala de cinza (chroma=0), então
// usamos oklch com chroma real para as duas linhas se distinguirem.
const COLOR_PAST   = 'var(--primary)';
const COLOR_FUTURE = 'var(--primary)';

const chartConfig = {
  balancePast: {
    label: 'Saldo Real',
    color: COLOR_PAST,
  },
  balanceFuture: {
    label: 'Projeção',
    color: COLOR_FUTURE,
  },
} satisfies ChartConfig;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

export function BalanceEvolutionChart({ data }: BalanceEvolutionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
        Nenhuma conta cadastrada para exibir o gráfico.
      </div>
    );
  }

  // Y-axis domain with padding
  const allValues = data.flatMap((d) =>
    [d.balancePast, d.balanceFuture].filter((v): v is number => v !== null),
  );
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const padding = Math.max(Math.abs(maxVal - minVal) * 0.15, 100);
  const yDomain = [
    Math.floor(minVal - padding),
    Math.ceil(maxVal + padding),
  ] as [number, number];

  // Encontra o label do mês atual (ponto de junção das duas linhas)
  const currentMonthLabel = data.find((d) => !d.isFuture && d.balanceFuture !== null)?.month;

  return (
    <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ top: 12, right: 16, left: 8, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />

        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          domain={yDomain}
          tickFormatter={formatCurrency}
          className="text-xs"
          width={72}
        />

        {/* Linha vertical marcando a divisão passado/futuro */}
        {currentMonthLabel && (
          <ReferenceLine
            x={currentMonthLabel}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: 'Hoje',
              position: 'insideTopRight',
              fontSize: 10,
              fill: 'var(--muted-foreground)',
              dy: -4,
            }}
          />
        )}

        <ChartTooltip
          cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '4 4' }}
          content={<ChartTooltipContent indicator="line" />}
        />

        {/* Linha SÓLIDA — saldo histórico real (passado + mês atual) */}
        <Area
          type="monotone"
          dataKey="balancePast"
          name="balancePast"
          stroke={COLOR_PAST}
          strokeWidth={4}
          fill="url(#colorBalance)"
          dot={false}
          activeDot={{ r: 6, fill: COLOR_PAST, stroke: 'var(--background)', strokeWidth: 2 }}
          connectNulls
        />

        {/* Linha TRACEJADA — projeção futura (mês atual + futuros) */}
        <Area
          type="monotone"
          dataKey="balanceFuture"
          name="balanceFuture"
          stroke={COLOR_PAST}
          strokeWidth={4}
          strokeOpacity={0.4}
          strokeDasharray="6 6"
          fill="url(#colorBalance)"
          dot={false}
          activeDot={{ r: 6, fill: COLOR_FUTURE, stroke: 'var(--background)', strokeWidth: 2 }}
          connectNulls
        />
      </AreaChart>
    </ChartContainer>
  );
}

// Exporta as cores para uso na legenda do Dashboard
export { COLOR_PAST, COLOR_FUTURE };
