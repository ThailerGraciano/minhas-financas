"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
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

  // Domain with breathing room
  const yDomain = [
    minBalance < 0 ? Math.floor(minBalance * 1.1) : 0,
    maxBalance === 0 && minBalance === 0 ? 100 : Math.ceil(maxBalance * 1.1),
  ];

  // Final balance to determine badge state
  const finalBalance = allValues.length > 0 ? allValues[allValues.length - 1] : 0;
  const isPositive = finalBalance >= 0;

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayFormatted = formattedData.find((d) => d.date === todayStr)?.formattedDate;

  const hasPastData = formattedData.some((d) => d.balancePast !== null);
  const hasFutureData = formattedData.some((d) => d.balanceProjected !== null);

  return (
    <Card className="rounded-[1.5rem] sm:rounded-[2rem] border-white/10 shadow-sm bg-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5 sm:px-6">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
          <TrendingUp className="w-5 h-5 text-primary" />
          Curva de Saldo
        </CardTitle>

        {/* Badge de Saldo Positivo / Negativo */}
        <Badge
          variant="outline"
          className={cn(
            "font-semibold text-xs px-3 py-1 rounded-full border transition-colors",
            isPositive
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-rose-500/15 text-rose-400 border-rose-500/30",
          )}
        >
          {isPositive ? "Saldo Positivo" : "Saldo Negativo"}
        </Badge>
      </CardHeader>

      <CardContent className="px-3 sm:px-6 pb-5 pt-2">
        <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
          <AreaChart accessibilityLayer data={formattedData} margin={{ top: 14, left: -12, right: 12, bottom: 0 }}>
            <defs>
              {/* Gradiente Laranja para a Linha (Stroke) */}
              <linearGradient id="planningLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FF5500" />
                <stop offset="50%" stopColor="#FF7A00" />
                <stop offset="100%" stopColor="#FFAA00" />
              </linearGradient>

              {/* Gradiente de Preenchimento: Passado */}
              <linearGradient id="colorBalancePlanningPast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>

              {/* Gradiente de Preenchimento: Futuro */}
              <linearGradient id="colorBalancePlanningFuture" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
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
              className="text-xs text-muted-foreground"
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
              className="text-xs text-muted-foreground"
              width={58}
            />

            {/* Marco de Hoje: Linha vertical tracejada com label no topo */}
            {todayFormatted && (
              <ReferenceLine
                x={todayFormatted}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "Hoje",
                  position: "insideTopRight",
                  fontSize: 11,
                  fontWeight: 600,
                  fill: "var(--muted-foreground)",
                  dy: -6,
                }}
              />
            )}

            <ChartTooltip
              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }}
              content={<ChartTooltipContent indicator="line" />}
            />

            {/* Linha TRACEJADA — saldo histórico real (passado até hoje) */}
            <Area
              type="monotone"
              dataKey="balancePast"
              name="balancePast"
              stroke="url(#planningLineGradient)"
              strokeWidth={3}
              strokeDasharray="5 5"
              fill="url(#colorBalancePlanningPast)"
              dot={false}
              activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
            />

            {/* Linha CONTÍNUA — projeção futura (hoje em diante) */}
            <Area
              type="monotone"
              dataKey="balanceProjected"
              name="balanceProjected"
              stroke="url(#planningLineGradient)"
              strokeWidth={3}
              fill="url(#colorBalancePlanningFuture)"
              dot={false}
              activeDot={{ r: 6, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ChartContainer>

        {/* Legenda na base do gráfico */}
        <div className="flex flex-wrap items-center gap-6 mt-4 pt-3 border-t border-white/5 px-1">
          {hasPastData && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <svg width="24" height="4" aria-hidden="true" className="shrink-0">
                <line x1="0" y1="2" x2="24" y2="2" stroke="var(--primary)" strokeWidth="2.5" strokeDasharray="5 5" />
              </svg>
              <span>Saldo Real (Passado)</span>
            </div>
          )}
          {hasFutureData && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-6 h-0.5 rounded bg-primary shrink-0" />
              <span>Projeção (Futuro)</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
