"use client";

import { DaySelectorCarousel } from "@/components/day-selector-carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
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
  creditCardId?: number | null;
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
      return `${capitalizedWeek}, ${capitalizedDay}`;
    } catch {
      return activeDay.date;
    }
  }, [activeDay.date]);

  const isTodayActive = activeDay.date === todayStr;
  const hasTodayInProjection = projection.some((p) => p.date === todayStr);
  const dayNetVariation = (activeDay.total_incomes || 0) - (activeDay.total_expenses || 0);

  return (
    <Card className="rounded-[1.5rem] sm:rounded-[2rem] border-white/10 shadow-sm bg-card overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5 sm:px-6">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
          <CalendarDays className="w-5 h-5 text-primary" />
          Previsão Dia a Dia
        </CardTitle>

        {/* Botão rápido para voltar ao dia de hoje se não estiver selecionado */}
        {hasTodayInProjection && !isTodayActive && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setSelectedDate(todayStr)}
            className="text-xs text-primary hover:text-primary gap-1 px-2.5 h-7 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Hoje
          </Button>
        )}
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pb-6 pt-0 space-y-4 flex-1 flex flex-col">
        {/* Carrossel Horizontal de Dias */}
        <DaySelectorCarousel days={projection} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {/* Container Principal do Dia Selecionado */}
        <div className="bg-muted/20 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
          {/* Cabeçalho do dia */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm text-foreground font-bold">{activeDateFormatted}</span>
              {isTodayActive && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold bg-primary/15 text-primary border-primary/30 px-1.5 py-0"
                >
                  Hoje
                </Badge>
              )}
            </div>

            <span className="text-[11px] text-muted-foreground bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 font-medium shrink-0">
              {activeDay.transactions_of_the_day.length}{" "}
              {activeDay.transactions_of_the_day.length === 1 ? "movimentação" : "movimentações"}
            </span>
          </div>

          {/* Destaque Principal: Saldo Projetado do Dia */}
          <div className="relative overflow-hidden rounded-2xl bg-card/90 border border-white/10 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div
              className={cn(
                "absolute -right-8 -bottom-8 w-28 h-28 rounded-full blur-2xl opacity-15 pointer-events-none",
                activeDay.projected_balance >= 0 ? "bg-primary" : "bg-rose-500",
              )}
            />

            <div className="space-y-1 relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                Saldo Final Previsto
              </span>
              <div
                className={cn(
                  "text-2xl sm:text-3xl font-black tracking-tight tabular-nums",
                  activeDay.projected_balance >= 0 ? "text-primary" : "text-rose-500",
                )}
              >
                {formatCurrency(activeDay.projected_balance)}
              </div>
            </div>

            {/* Variação do Dia */}
            <div className="relative z-10 flex items-center gap-2 pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0">
              <div
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 tabular-nums border",
                  dayNetVariation > 0
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                    : dayNetVariation < 0
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                      : "bg-white/5 text-muted-foreground border-white/10",
                )}
              >
                {dayNetVariation > 0 && <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />}
                {dayNetVariation < 0 && <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />}
                <span>
                  {dayNetVariation === 0
                    ? "Saldo estável no dia"
                    : `${dayNetVariation > 0 ? "+" : ""}${formatCurrency(dayNetVariation)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Fluxo Diário: Entradas e Saídas em 2 Colunas Limpas */}
          <div className="grid grid-cols-2 gap-3">
            {/* Entradas */}
            <div className="p-3.5 rounded-xl bg-card/60 border border-emerald-500/20 flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Entradas
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="text-base sm:text-lg font-bold text-emerald-400 tabular-nums break-words leading-tight">
                {activeDay.total_incomes > 0 ? `+ ${formatCurrency(activeDay.total_incomes)}` : "R$ 0,00"}
              </span>
            </div>

            {/* Saídas */}
            <div className="p-3.5 rounded-xl bg-card/60 border border-rose-500/20 flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Saídas</span>
                <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <TrendingDown className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="text-base sm:text-lg font-bold text-rose-400 tabular-nums break-words leading-tight">
                {activeDay.total_expenses > 0 ? `- ${formatCurrency(activeDay.total_expenses)}` : "R$ 0,00"}
              </span>
            </div>
          </div>

          {/* Lançamentos do Dia Selecionado */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Movimentações deste dia
            </span>

            {activeDay.transactions_of_the_day.length === 0 ? (
              <div className="text-center py-7 px-4 rounded-xl border border-dashed border-white/10 bg-card/30 flex flex-col items-center justify-center gap-2">
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground">
                  <CalendarCheck className="w-4 h-4 text-muted-foreground/70" />
                </div>
                <p className="text-xs font-semibold text-foreground">Nenhuma movimentação prevista para este dia</p>
                <p className="text-[11px] text-muted-foreground">
                  Não há receitas nem despesas programadas nesta data.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {activeDay.transactions_of_the_day.map((tx) => {
                  const isIncome = tx.type === "income" || (tx.type === "transfer" && !!tx.parentTransactionId);
                  const isInvoice = tx.description.toLowerCase().includes("fatura") || Boolean(tx.creditCard);

                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-card/70 border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                            isIncome
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : isInvoice
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20",
                          )}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : isInvoice ? (
                            <CreditCard className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
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
                          "font-bold tabular-nums shrink-0 text-sm",
                          isIncome ? "text-emerald-400" : "text-rose-400",
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
