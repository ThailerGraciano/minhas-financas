"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Landmark } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface PaymentMethodMonthItem {
  month: string;
  rawMonth?: string;
  isFuture?: boolean;
  Cartão: number;
  Conta: number;
  [key: string]: unknown;
}

interface PaymentMethodComparisonProps {
  data: PaymentMethodMonthItem[];
  selectedMonth?: string;
  showBalance?: boolean;
}

const COLOR_CARD = "var(--primary)";
const COLOR_ACCOUNT = "#38bdf8";

export function PaymentMethodComparison({ data, selectedMonth, showBalance = true }: PaymentMethodComparisonProps) {
  const [viewMode, setViewMode] = useState<"past" | "future" | "all">("past");

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

  const currentMonthData = useMemo(() => {
    if (!data || data.length === 0) return null;
    if (selectedMonth) {
      const found = data.find((d) => d.rawMonth === selectedMonth);
      if (found) return found;
    }
    const current = data.find((d) => !d.isFuture);
    return current || data[0];
  }, [data, selectedMonth]);

  const cardTotal = currentMonthData?.Cartão ?? 0;
  const accountTotal = currentMonthData?.Conta ?? 0;
  const totalCurrent = cardTotal + accountTotal;

  const cardPercent = totalCurrent > 0 ? (cardTotal / totalCurrent) * 100 : 0;
  const accountPercent = totalCurrent > 0 ? (accountTotal / totalCurrent) * 100 : 0;

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
      <div className="bg-card/70 backdrop-blur-xl rounded-[2rem] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] p-6 text-center text-sm text-muted-foreground">
        Nenhum dado de gastos por meio de pagamento disponível.
      </div>
    );
  }

  return (
    <div className="bg-card/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] space-y-6 w-full min-w-0 relative overflow-hidden">
      {/* Specular top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Header com Tabs de período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Gastos: Cartão vs. Conta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparação mensal entre despesas no cartão de crédito e em conta
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
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Mês: <strong className="text-foreground">{currentMonthData.month}</strong>
            </span>
            <span>
              Total: <strong className="text-foreground">{formatCurrency(totalCurrent)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cartão de Crédito */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_CARD }} />
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Cartão de Crédito</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-bold text-primary border-primary/30 bg-primary/10"
                >
                  {cardPercent.toFixed(1)}%
                </Badge>
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground mt-2">{formatCurrency(cardTotal)}</div>
            </div>

            {/* Conta */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between hover:border-[#38bdf8]/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#38bdf8]" />
                  <Landmark className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Conta</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-bold text-[#38bdf8] border-[#38bdf8]/30 bg-[#38bdf8]/10"
                >
                  {accountPercent.toFixed(1)}%
                </Badge>
              </div>
              <div className="text-xl sm:text-2xl font-black text-foreground mt-2">{formatCurrency(accountTotal)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de Barras Empilhadas */}
      <div className="h-[280px] sm:h-[320px] w-full min-w-0 pt-2">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 280 }}>
          <BarChart data={filteredData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
            <YAxis tickLine={false} axisLine={false} tickFormatter={formatCompact} className="text-xs" width={70} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as PaymentMethodMonthItem;
                  const total = item.Cartão + item.Conta;
                  return (
                    <div className="bg-popover border border-white/10 text-popover-foreground rounded-2xl shadow-xl p-3 min-w-[220px] space-y-2">
                      <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                        <span className="font-bold text-xs">{label}</span>
                        {item.isFuture && (
                          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground uppercase font-medium">
                            Projeção
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_CARD }} />
                            <span className="text-muted-foreground">Cartão de Crédito:</span>
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(item.Cartão)} ({total > 0 ? ((item.Cartão / total) * 100).toFixed(0) : 0}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                            <span className="text-muted-foreground">Conta:</span>
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(item.Conta)} ({total > 0 ? ((item.Conta / total) * 100).toFixed(0) : 0}%)
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
            <Bar dataKey="Conta" stackId="a" fill={COLOR_ACCOUNT} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Cartão" stackId="a" fill={COLOR_CARD} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-6 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_CARD }} />
          <span>Cartão de Crédito</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#38bdf8]" />
          <span>Conta</span>
        </div>
      </div>
    </div>
  );
}
