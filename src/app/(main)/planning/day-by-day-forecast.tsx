"use client";

import { DaySelectorCarousel } from "@/components/day-selector-carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, CalendarDays, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

export type ForecastTransaction = {
  id: number | string;
  type: string;
  description: string;
  amount: string | number;
  account?: { name: string } | null;
  creditCard?: { name: string } | null;
  category?: { name: string } | null;
  parentTransactionId?: number | null;
};

export type DayProjection = {
  date: string;
  total_expenses: number;
  total_incomes: number;
  projected_balance: number;
  transactions_of_the_day: ForecastTransaction[];
};

export function DayByDayForecast({ projection }: { projection: DayProjection[] }) {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Inicializa com hoje se estiver na projeção, senão o primeiro dia
  const initialDate = useMemo(() => {
    const hasToday = projection.some((p) => p.date === todayStr);
    if (hasToday) return todayStr;
    return projection[0]?.date || todayStr;
  }, [projection, todayStr]);

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  const activeDay = useMemo(() => {
    return (
      projection.find((p) => p.date === selectedDate) ||
      projection[0] || {
        date: selectedDate,
        total_expenses: 0,
        total_incomes: 0,
        projected_balance: 0,
        transactions_of_the_day: [],
      }
    );
  }, [projection, selectedDate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const activeDateFormatted = useMemo(() => {
    try {
      const parsed = parseISO(activeDay.date);
      const dayFormatted = format(parsed, "dd 'de' MMMM", { locale: ptBR });
      const weekDayFormatted = format(parsed, "EEEE", { locale: ptBR });
      const capitalizedDay = dayFormatted.charAt(0).toUpperCase() + dayFormatted.slice(1);
      const capitalizedWeek = weekDayFormatted.charAt(0).toUpperCase() + weekDayFormatted.slice(1);
      return `${capitalizedDay}, ${capitalizedWeek}`;
    } catch {
      return activeDay.date;
    }
  }, [activeDay.date]);

  return (
    <Card className="rounded-[1.5rem] sm:rounded-[2rem] border-white/10 shadow-sm bg-card overflow-hidden flex flex-col">
      <CardHeader className="pb-3 pt-5 px-5 sm:px-6">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
          <CalendarDays className="w-5 h-5 text-primary" />
          Previsão Dia a Dia
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pb-6 pt-0 space-y-4 flex-1 flex flex-col">
        {/* Carrossel Horizontal de Dias */}
        <DaySelectorCarousel days={projection} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {/* Card de Resumo do Dia Selecionado */}
        <div className="bg-muted/20 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Resumo do Dia
              </span>
              <span className="text-xs text-foreground font-bold">• {activeDateFormatted}</span>
            </div>
            <span className="text-[11px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
              {activeDay.transactions_of_the_day.length}{" "}
              {activeDay.transactions_of_the_day.length === 1 ? "lançamento" : "lançamentos"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Saídas */}
            <div className="flex items-center gap-3 bg-card/60 p-3 rounded-xl border border-white/5">
              <div className="w-9 h-9 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Saídas</span>
                <span className="text-base sm:text-lg font-bold text-rose-500 truncate tabular-nums">
                  {formatCurrency(activeDay.total_expenses)}
                </span>
              </div>
            </div>

            {/* Entradas */}
            <div className="flex items-center gap-3 bg-card/60 p-3 rounded-xl border border-white/5">
              <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Entradas</span>
                <span className="text-base sm:text-lg font-bold text-emerald-500 truncate tabular-nums">
                  {formatCurrency(activeDay.total_incomes)}
                </span>
              </div>
            </div>

            {/* SALDO PREVISTO */}
            <div className="flex flex-col sm:items-end justify-center bg-card/60 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-white/5 sm:border-0">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
                SALDO PREVISTO
              </span>
              <span
                className={cn(
                  "text-xl sm:text-2xl font-black tracking-tight tabular-nums mt-0.5",
                  activeDay.projected_balance >= 0 ? "text-primary" : "text-rose-500",
                )}
              >
                {formatCurrency(activeDay.projected_balance)}
              </span>
            </div>
          </div>

          {/* Lançamentos do Dia Selecionado */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Movimentações deste dia
            </span>

            {activeDay.transactions_of_the_day.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs border border-dashed border-white/10 rounded-xl bg-card/40">
                Nenhuma movimentação prevista para este dia.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeDay.transactions_of_the_day.map((tx) => {
                  const isIncome = tx.type === "income" || (tx.type === "transfer" && !!tx.parentTransactionId);

                  return (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-xl bg-card/80 border border-white/5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                            isIncome ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500",
                          )}
                        >
                          {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground truncate">{tx.description}</span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {tx.account?.name || tx.creditCard?.name || "Conta"} • {tx.category?.name || "Geral"}
                          </span>
                        </div>
                      </div>

                      <span
                        className={cn(
                          "font-bold tabular-nums shrink-0",
                          isIncome ? "text-emerald-500" : "text-rose-500",
                        )}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(Number(tx.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
