"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Cell, Pie, PieChart } from "recharts";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface MarketCategoryChartProps {
  data: { 
    category: string; 
    value: number; 
    subcategories?: { name: string; value: number }[];
  }[];
}

const COLORS = [
  "#FF6B6B", // Vibrant Red
  "#4ECDC4", // Vibrant Teal
  "#45B7D1", // Vibrant Blue
  "#FDCB6E", // Vibrant Yellow
  "#6C5CE7", // Vibrant Purple
  "#FFA07A", // Vibrant Salmon
  "#2ECC71", // Vibrant Emerald
  "#9B59B6", // Vibrant Amethyst
  "#F1C40F", // Vibrant Sunflower
  "#E74C3C", // Vibrant Alizarin
  "#3498DB", // Vibrant Peter River
  "#1ABC9C", // Vibrant Turquoise
  "#D35400", // Vibrant Pumpkin
  "#8E44AD", // Vibrant Wisteria
  "#27AE60", // Vibrant Nephritis
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);

export function MarketCategoryChart({ data }: MarketCategoryChartProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const chartData = [...data]
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length],
    }));

  const config = data.reduce((acc, item, index) => {
    acc[item.category] = {
      label: item.category,
      color: COLORS[index % COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  config.value = { label: "Valor" };

  if (data.length === 0) {
    return (
      <Card className="rounded-[2rem] border-transparent shadow-sm flex flex-col h-full w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Gastos por Categoria</CardTitle>
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
        <CardTitle className="text-xl font-bold">Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px]">
        <ChartContainer config={config} className="mx-auto aspect-square max-h-[300px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel formatter={(value) => formatCurrency(Number(value))} />}
            />
            <Pie data={chartData} dataKey="value" nameKey="category" innerRadius={60} strokeWidth={5}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="mt-6">
          <div className="rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium rounded-tl-xl">Categoria</th>
                  <th className="px-4 py-3 font-medium text-right rounded-tr-xl">Valor</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item, index) => {
                  const hasSubcategories = item.subcategories && item.subcategories.length > 0;
                  const isExpanded = expandedCategories[item.category];

                  return (
                    <React.Fragment key={index}>
                      <tr 
                        className={`border-b last:border-0 hover:bg-muted/50 transition-colors ${hasSubcategories ? 'cursor-pointer' : ''}`}
                        onClick={() => hasSubcategories && toggleCategory(item.category)}
                      >
                        <td className="px-4 py-3 flex items-center gap-2">
                          {hasSubcategories ? (
                            isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            )
                          ) : (
                            <div className="w-4 h-4 shrink-0" />
                          )}
                          <div
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="font-medium truncate">{item.category}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.value)}</td>
                      </tr>
                      {isExpanded && item.subcategories && (
                        item.subcategories.map((sub, subIndex) => (
                          <tr key={`sub-${index}-${subIndex}`} className="border-b last:border-0 bg-muted/20">
                            <td className="px-4 py-2 pl-12 flex items-center gap-2 text-muted-foreground">
                              <span className="text-sm truncate">{sub.name}</span>
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-muted-foreground">
                              {formatCurrency(sub.value)}
                            </td>
                          </tr>
                        ))
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
