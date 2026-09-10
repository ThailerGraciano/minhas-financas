"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from "@/components/ui/chart";

const COLORS = [
  "hsl(24, 100%, 50%)", // Laranja padrão do tema
  "hsl(217, 91%, 60%)", // Azul (Blue)
  "hsl(142, 71%, 45%)", // Verde (Green)
  "hsl(283, 39%, 53%)", // Roxo (Purple)
  "hsl(346, 87%, 61%)", // Rosa (Pink)
  "hsl(175, 77%, 41%)", // Turquesa (Teal)
  "hsl(43, 100%, 50%)", // Amarelo (Amber)
  "hsl(0, 84%, 60%)", // Vermelho (Red)
  "hsl(230, 80%, 65%)", // Indigo (Indigo)
  "hsl(15, 80%, 50%)", // Laranja Vibrante
  "hsl(100, 60%, 50%)", // Verde Limão
];

type TooltipPayload = {
  dataKey: string;
  name?: string;
  value: number;
  color?: string;
  fill?: string;
  payload: Record<string, string | number>;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  hoveredKey?: string | null;
};

type ExtendedTooltipPayload = TooltipPayload & { originalDataKey: string };

const CustomTooltip = ({ active, payload, label, hoveredKey }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border text-popover-foreground rounded-lg shadow-md p-3 min-w-[200px]">
        <div className="font-semibold mb-2 border-b pb-1">{label}</div>
        <div className="flex flex-col gap-1.5">
          {payload
            .reduce((acc: ExtendedTooltipPayload[], entry: TooltipPayload) => {
              const baseKey = entry.dataKey.replace(/(_past|_future)$/, "");
              if (!acc.find((item) => item.dataKey === baseKey)) {
                acc.push({
                  ...entry,
                  originalDataKey: entry.dataKey,
                  dataKey: baseKey,
                });
              }
              return acc;
            }, [])
            .map((entry: ExtendedTooltipPayload, index: number) => {
              const installmentText = entry.payload[`${entry.originalDataKey}_installment`];
              const isHovered = hoveredKey === entry.dataKey;
              const isDimmed = hoveredKey && !isHovered;

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between text-sm transition-opacity duration-200 ${isDimmed ? "opacity-30" : "opacity-100"}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color || entry.fill }}
                    />
                    <span className={`font-medium ${isHovered ? "text-foreground" : "text-muted-foreground"}`}>
                      {entry.dataKey} {installmentText ? `(${installmentText})` : ""}
                    </span>
                  </div>
                  <span className="font-bold ml-4">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(entry.value)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    );
  }
  return null;
};

export function InstallmentsStackedChart({
  data,
  keys,
}: {
  data: Record<string, string | number | boolean>[];
  keys: string[];
}) {
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);

  // Configura o chart dinamicamente com as chaves reais
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    keys.forEach((key, index) => {
      config[key] = {
        label: key,
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [keys]);

  // Transforma os dados dividindo entre passado e futuro para o efeito pontilhado
  const transformedData = React.useMemo(() => {
    return data.map((d, index) => {
      const isPast = Boolean(d.isPast);
      const isBoundary = !isPast && (index === 0 || Boolean(data[index - 1].isPast));

      const newObj: Record<string, string | number | boolean> = { month: String(d.month), isPast: isPast };
      keys.forEach((key) => {
        const val = d[key];
        const instText = d[`${key}_installment`];

        if (val !== undefined) {
          if (isPast) {
            newObj[`${key}_past`] = val;
            if (instText) newObj[`${key}_past_installment`] = instText;
          } else if (isBoundary) {
            // Na fronteira, colocamos em ambos para que as linhas se conectem perfeitamente
            newObj[`${key}_past`] = val;
            newObj[`${key}_future`] = val;
            if (instText) {
              newObj[`${key}_past_installment`] = instText;
              newObj[`${key}_future_installment`] = instText;
            }
          } else {
            newObj[`${key}_future`] = val;
            if (instText) newObj[`${key}_future_installment`] = instText;
          }
        }
      });
      return newObj;
    });
  }, [data, keys]);

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
        Nenhuma despesa parcelada projetada para os próximos meses.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
      <AreaChart accessibilityLayer data={transformedData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
        <defs>
          {keys.map((key, index) => {
            const color = chartConfig[key]?.color || `hsl(${index * 40}, 70%, 50%)`;
            return (
              <linearGradient key={key} id={`fill-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) =>
            new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              notation: "compact",
            }).format(value)
          }
          width={80}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.1 }}
          content={<CustomTooltip hoveredKey={hoveredKey} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        {keys.map((key, index) => {
          const color = chartConfig[key]?.color || COLORS[index % COLORS.length];
          const isFaded = hoveredKey && hoveredKey !== key;
          const opacity = isFaded ? 0.2 : 1;

          return (
            <React.Fragment key={key}>
              <Area
                type="monotone"
                dataKey={`${key}_past`}
                stackId="past"
                stroke={color}
                fill={`url(#fill-${index})`}
                strokeDasharray="5 5"
                opacity={opacity}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                style={{ transition: "opacity 0.2s ease-in-out", cursor: "pointer" }}
              />
              <Area
                type="monotone"
                dataKey={`${key}_future`}
                stackId="future"
                stroke={color}
                fill={`url(#fill-${index})`}
                opacity={opacity}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                style={{ transition: "opacity 0.2s ease-in-out", cursor: "pointer" }}
              />
            </React.Fragment>
          );
        })}
      </AreaChart>
    </ChartContainer>
  );
}
