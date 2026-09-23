"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface ForecastMonthItem {
  month: string;
  rawMonth?: string;
  isFuture?: boolean;
  Parcelas: number;
  Fixas: number;
  Variáveis: number;
  [key: string]: unknown;
}

interface ExpenseTypeComparisonProps {
  data: ForecastMonthItem[];
  selectedMonth?: string;
  showBalance?: boolean;
}

export function ExpenseTypeComparison({ data, selectedMonth, showBalance = true }: ExpenseTypeComparisonProps) {
  const [viewMode, setViewMode] = useState<"past" | "future" | "all">("all");

  const formatCurrency = (value: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCompact = (value: number) => {
    if (!showBalance) return "••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  // Encontra os dados do mês focado
  const currentMonthData = useMemo(() => {
    if (!data || data.length === 0) return null;
    if (selectedMonth) {
      const found = data.find((d) => d.rawMonth === selectedMonth);
      if (found) return found;
    }
    const current = data.find((d) => !d.isFuture);
    return current || data[0];
  }, [data, selectedMonth]);

  const totalCurrent =
    (currentMonthData?.Fixas || 0) + (currentMonthData?.Variáveis || 0) + (currentMonthData?.Parcelas || 0);

  const fixedPercent = totalCurrent > 0 ? ((currentMonthData?.Fixas || 0) / totalCurrent) * 100 : 0;
  const variablePercent = totalCurrent > 0 ? ((currentMonthData?.Variáveis || 0) / totalCurrent) * 100 : 0;
  const installmentPercent = totalCurrent > 0 ? ((currentMonthData?.Parcelas || 0) / totalCurrent) * 100 : 0;

  // Filtra dados para o gráfico conforme a tab
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (viewMode === "past") {
      return data.filter((d) => !d.isFuture);
    }
    if (viewMode === "future") {
      return data.filter((d) => d.isFuture);
    }
    return data;
  }, [data, viewMode]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-[2rem] border border-white/5 shadow-sm p-6 text-center text-sm text-muted-foreground">
        Nenhum dado de composição de despesas disponível.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 border border-white/5 shadow-sm space-y-6 w-full min-w-0">
      {/* Header com Tabs de período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Composição das Despesas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparação mensal entre Fixas, Variáveis e Parceladas
            </p>
          </div>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "past" | "future" | "all")}>
          <TabsList className="bg-white/5 p-1 rounded-full text-xs">
            <TabsTrigger value="past" className="rounded-full text-xs px-3">
              Últimos 6m
            </TabsTrigger>
            <TabsTrigger value="future" className="rounded-full text-xs px-3">
              Próximos 6m
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-full text-xs px-3">
              12 Meses
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cards de Resumo do Mês Focado */}
      {currentMonthData && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Mês: <strong className="text-foreground">{currentMonthData.month}</strong>
            </span>
            <span>
              Total: <strong className="text-foreground">{formatCurrency(totalCurrent)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Fixas */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between hover:border-[#eab308]/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#eab308]" />
                  <span className="text-xs font-semibold text-foreground">Fixas</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-bold text-[#eab308] border-[#eab308]/30 bg-[#eab308]/10"
                >
                  {fixedPercent.toFixed(1)}%
                </Badge>
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground mt-2">
                {formatCurrency(currentMonthData.Fixas)}
              </div>
            </div>

            {/* Variáveis */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between hover:border-[#22c55e]/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
                  <span className="text-xs font-semibold text-foreground">Variáveis</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-bold text-[#22c55e] border-[#22c55e]/30 bg-[#22c55e]/10"
                >
                  {variablePercent.toFixed(1)}%
                </Badge>
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground mt-2">
                {formatCurrency(currentMonthData.Variáveis)}
              </div>
            </div>

            {/* Parceladas */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between hover:border-[#3b82f6]/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#3b82f6]" />
                  <span className="text-xs font-semibold text-foreground">Parceladas</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-bold text-[#3b82f6] border-[#3b82f6]/30 bg-[#3b82f6]/10"
                >
                  {installmentPercent.toFixed(1)}%
                </Badge>
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground mt-2">
                {formatCurrency(currentMonthData.Parcelas)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de Barras Empilhadas */}
      <div className="h-[280px] sm:h-[320px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
            <YAxis tickLine={false} axisLine={false} tickFormatter={formatCompact} className="text-xs" width={70} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as ForecastMonthItem;
                  const total = item.Fixas + item.Variáveis + item.Parcelas;
                  return (
                    <div className="bg-popover border border-white/10 text-popover-foreground rounded-2xl shadow-xl p-3 min-w-[210px] space-y-2">
                      <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                        <span className="font-bold text-xs">{label}</span>
                        {item.isFuture && (
                          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground uppercase font-medium">
                            Projeção
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                            <span className="text-muted-foreground">Fixas:</span>
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(item.Fixas)} ({total > 0 ? ((item.Fixas / total) * 100).toFixed(0) : 0}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                            <span className="text-muted-foreground">Variáveis:</span>
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(item.Variáveis)} (
                            {total > 0 ? ((item.Variáveis / total) * 100).toFixed(0) : 0}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                            <span className="text-muted-foreground">Parceladas:</span>
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(item.Parcelas)} (
                            {total > 0 ? ((item.Parcelas / total) * 100).toFixed(0) : 0}%)
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-1.5 flex justify-between font-bold text-xs">
                        <span>Total:</span>
                        <span className="text-primary">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="Fixas" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Variáveis" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Parcelas" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-6 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#eab308]" />
          <span>Fixas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
          <span>Variáveis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#3b82f6]" />
          <span>Parceladas</span>
        </div>
      </div>
    </div>
  );
}
