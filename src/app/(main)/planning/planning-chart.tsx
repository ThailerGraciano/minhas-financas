"use client";

import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";

export type PlanningChartPoint = {
  date: string;
  balancePast?: number | null;
  balanceProjected?: number | null;
  projected_balance?: number;
};

interface PlanningChartProps {
  data: PlanningChartPoint[];
}

const chartConfig = {
  balancePast: {
    label: "Saldo Real",
    color: "var(--primary)",
  },
  balanceProjected: {
    label: "Saldo Previsto",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function PlanningChart({ data }: PlanningChartProps) {
  const formattedData = data.map((item) => {
    const projBal = item.balanceProjected !== undefined ? item.balanceProjected : item.projected_balance;
    return {
      ...item,
      formattedDate: format(parseISO(item.date), "dd/MM", { locale: ptBR }),
      balancePast: item.balancePast ?? null,
      balanceProjected: projBal ?? null,
    };
  });

  const allValues = formattedData.flatMap((d) =>
    [d.balancePast, d.balanceProjected].filter((v): v is number => v !== null && !isNaN(v)),
  );
  const minBalance = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxBalance = allValues.length > 0 ? Math.max(...allValues) : 100;

  // Add some padding to Y axis, ensure it doesn't collapse if everything is 0
  const yDomain = [
    minBalance < 0 ? Math.floor(minBalance * 1.1) : 0,
    maxBalance === 0 && minBalance === 0 ? 100 : Math.ceil(maxBalance * 1.1),
  ];

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayFormatted = formattedData.find((d) => d.date === todayStr)?.formattedDate;

  const hasPastData = formattedData.some((d) => d.balancePast !== null);
  const hasFutureData = formattedData.some((d) => d.balanceProjected !== null);

  return (
    <div className="w-full mt-4">
      <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
        <AreaChart accessibilityLayer data={formattedData} margin={{ top: 12, left: -10, right: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBalancePlanningPast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorBalancePlanningFuture" x1="0" y1="0" x2="0" y2="1">
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
            minTickGap={24}
            className="text-xs"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            domain={yDomain}
            tickFormatter={(value) => {
              if (value === 0) return "R$ 0";
              return `R$ ${Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
            }}
            className="text-xs"
            width={55}
          />
          {todayFormatted && (
            <ReferenceLine
              x={todayFormatted}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: "Hoje",
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--muted-foreground)",
                dy: -4,
              }}
            />
          )}
          <ChartTooltip
            cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }}
            content={<ChartTooltipContent indicator="line" />}
          />
          {/* Linha PONTILHADA — saldo histórico real (passado até hoje) */}
          <Area
            type="monotone"
            dataKey="balancePast"
            name="balancePast"
            stroke="var(--color-balancePast)"
            strokeWidth={3}
            strokeDasharray="5 5"
            fill="url(#colorBalancePlanningPast)"
            dot={false}
            activeDot={{ r: 5, fill: "var(--color-balancePast)" }}
          />
          {/* Linha SÓLIDA — projeção futura (hoje em diante) */}
          <Area
            type="monotone"
            dataKey="balanceProjected"
            name="balanceProjected"
            stroke="var(--color-balanceProjected)"
            strokeWidth={3}
            fill="url(#colorBalancePlanningFuture)"
            dot={false}
            activeDot={{ r: 6, fill: "var(--color-balanceProjected)" }}
          />
        </AreaChart>
      </ChartContainer>

      {/* Legenda visual */}
      <div className="flex items-center gap-6 mt-3 px-2">
        {hasPastData && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <svg width="24" height="4" aria-hidden="true">
              <line x1="0" y1="2" x2="24" y2="2" stroke="var(--primary)" strokeWidth="2" strokeDasharray="5 5" />
            </svg>
            <span>Saldo Real (Passado)</span>
          </div>
        )}
        {hasFutureData && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block w-6 h-1 rounded bg-primary" />
            <span>Projeção (Futuro)</span>
          </div>
        )}
      </div>
    </div>
  );
}
