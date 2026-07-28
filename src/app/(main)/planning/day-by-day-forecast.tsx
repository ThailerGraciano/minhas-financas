'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type DayProjection = {
  date: string;
  total_expenses: number;
  total_incomes: number;
  projected_balance: number;
  transactions_of_the_day: any[];
};

export function DayByDayForecast({ projection }: { projection: DayProjection[] }) {
  const [selectedDay, setSelectedDay] = useState<DayProjection | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDay = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
  };

  const formatDayFull = (dateStr: string) => {
    return format(parseISO(dateStr), "dd 'de' MMMM, EEEE", { locale: ptBR });
  };

  return (
    <>
      <Card className="flex flex-col h-[600px]">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-muted-foreground" />
            Previsão Dia a Dia
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto pr-2 space-y-3">
          {projection.filter(day => day.total_expenses > 0 || day.total_incomes > 0).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl border-dashed">
              Nenhuma movimentação prevista.
            </div>
          ) : (
            projection.filter(day => day.total_expenses > 0 || day.total_incomes > 0).map((day) => {
              const hasExpenses = day.total_expenses > 0;
              const hasIncomes = day.total_incomes > 0;
              const isNegativeBalance = day.projected_balance < 0;

              return (
                <div
                  key={day.date}
                  onClick={() => setSelectedDay(day)}
                  className="group p-3 border rounded-xl bg-card hover:bg-muted/40 transition-all flex items-center gap-4 text-sm cursor-pointer hover:border-primary/40 hover:shadow-sm"
                >
                  {/* Esquerda: Data Destaque */}
                  <div className="flex flex-col items-center justify-center bg-muted/50 rounded-lg p-2 w-16 h-16 flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    <span className="text-xl font-bold text-foreground">{format(parseISO(day.date), "dd")}</span>
                    <span className="text-xs text-muted-foreground uppercase">{format(parseISO(day.date), "MMM", { locale: ptBR })}</span>
                  </div>

                  {/* Centro: Movimentações */}
                  <div className="flex flex-1 flex-col justify-center gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className={`w-4 h-4 ${hasExpenses ? 'text-red-500' : 'text-muted-foreground/40'}`} />
                      <span className={`font-medium ${hasExpenses ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {formatCurrency(day.total_expenses)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className={`w-4 h-4 ${hasIncomes ? 'text-green-600' : 'text-muted-foreground/40'}`} />
                      <span className={`font-medium ${hasIncomes ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {formatCurrency(day.total_incomes)}
                      </span>
                    </div>
                  </div>

                  {/* Direita: Saldo */}
                  <div className="flex flex-col items-end justify-center pr-2">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1">Saldo Previsto</span>
                    <span className={`text-lg font-bold ${isNegativeBalance ? "text-red-500" : "text-primary"}`}>
                      {formatCurrency(day.projected_balance)}
                    </span>
                  </div>
                </div>
              );
            }))}
        </CardContent>
      </Card>

      {/* Day Detail Modal */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-[550px]">
          {selectedDay && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  {formatDayFull(selectedDay.date)}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Resumo financeiro do dia selecionado.
                </DialogDescription>
              </DialogHeader>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="rounded-lg border p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowDownCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-muted-foreground">Despesas</span>
                  </div>
                  <span className="font-bold text-red-500 text-sm">
                    {formatCurrency(selectedDay.total_expenses)}
                  </span>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowUpCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">Receitas</span>
                  </div>
                  <span className="font-bold text-green-600 text-sm">
                    {formatCurrency(selectedDay.total_incomes)}
                  </span>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Saldo</span>
                  </div>
                  <span className={`font-bold text-sm ${selectedDay.projected_balance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                    {formatCurrency(selectedDay.projected_balance)}
                  </span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="mt-4 max-h-[350px] overflow-y-auto">
                {selectedDay.transactions_of_the_day.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg border-dashed">
                    Nenhuma movimentação neste dia.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDay.transactions_of_the_day.map((tx: any) => {
                        const isIncome = tx.type === 'income' || (tx.type === 'transfer' && tx.description.includes('(Entrada)'));
                        return (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm line-clamp-1">{tx.description}</span>
                                <span className="text-xs text-muted-foreground">
                                  {tx.account?.name || tx.creditCard?.name || 'Geral'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {tx.category?.name || '-'}
                            </TableCell>
                            <TableCell className={`text-right font-bold whitespace-nowrap ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                              {isIncome ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
