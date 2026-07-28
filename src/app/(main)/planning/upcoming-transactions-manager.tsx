'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WalletCards, CalendarDays, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: number;
  type: string;
  amount: string;
  description: string;
  date: string;
  account: { id: number; name: string } | null;
  creditCard?: { id: number; name: string } | null;
  category: { id: number; name: string } | null;
}

interface UpcomingTransactionsManagerProps {
  upcomingTransactions: Transaction[];
  overdueTransactions: Transaction[];
}

export function UpcomingTransactionsManager({
  upcomingTransactions,
  overdueTransactions,
}: UpcomingTransactionsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDay = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
  };

  const formatFullDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  // Calculate overdue totals
  const overdueExpenses = overdueTransactions.filter(
    (tx) => tx.type === 'expense' || tx.type === 'credit_card_expense'
  );
  const overdueIncomes = overdueTransactions.filter((tx) => tx.type === 'income');

  const totalOverdueExpenses = overdueExpenses.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalOverdueIncomes = overdueIncomes.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const netOverdueAmount = totalOverdueIncomes - totalOverdueExpenses;

  const hasOverdue = overdueTransactions.length > 0;

  return (
    <>
      <Card className="flex flex-col h-[600px]">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <WalletCards className="w-5 h-5 text-muted-foreground" />
            Próximos Lançamentos (Gerenciador)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {upcomingTransactions.length === 0 && !hasOverdue ? (
            <div className="text-center p-12 text-muted-foreground border-t border-dashed">
              Nenhum lançamento previsto ou em atraso.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Overdue Group Row (displays first if exists) */}
                {hasOverdue && (
                  <TableRow
                    onClick={() => setIsDialogOpen(true)}
                    className="cursor-pointer bg-red-500/5 hover:bg-red-500/10 dark:bg-red-900/10 dark:hover:bg-red-900/20 transition-colors group"
                  >
                    <TableCell className="py-5">
                      <div className="bg-red-500/10 text-red-500 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 font-bold text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Vencidas
                      </div>
                    </TableCell>
                    <TableCell className="py-5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-red-500 dark:text-red-400">
                          {overdueTransactions.length} {overdueTransactions.length === 1 ? 'lançamento em atraso' : 'lançamentos em atraso'}
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {overdueTransactions.map((tx) => tx.description).join(', ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-bold whitespace-nowrap py-4 ${netOverdueAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {netOverdueAmount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netOverdueAmount))}
                    </TableCell>
                  </TableRow>
                )}

                {/* Upcoming/Future Rows */}
                {upcomingTransactions.map((tx) => {
                  const isIncome = tx.type === 'income' || (tx.type === 'transfer' && tx.description.includes('(Entrada)'));
                  return (
                    <TableRow key={tx.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium whitespace-nowrap py-4">
                        {formatDay(tx.date)}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-medium line-clamp-1" title={tx.description}>
                            {tx.description}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {tx.account?.name || tx.creditCard?.name || 'Geral'} • {tx.category?.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-bold whitespace-nowrap py-4 ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overdue Transactions Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Lançamentos Vencidos
            </DialogTitle>
            <DialogDescription>
              Estes lançamentos estão com status pendente e a data de vencimento já passou.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Summary */}
          <div className="grid grid-cols-2 gap-3 my-2">
            <div className="rounded-lg border p-3 text-center bg-red-500/5 dark:bg-red-950/10">
              <span className="text-xs text-muted-foreground block mb-1">Total Despesas</span>
              <span className="font-bold text-red-500 text-sm">
                {formatCurrency(totalOverdueExpenses)}
              </span>
            </div>
            <div className="rounded-lg border p-3 text-center bg-green-500/5 dark:bg-green-950/10">
              <span className="text-xs text-muted-foreground block mb-1">Total Receitas</span>
              <span className="font-bold text-green-600 dark:text-green-400 text-sm">
                {formatCurrency(totalOverdueIncomes)}
              </span>
            </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueTransactions.map((tx) => {
                  const isIncome = tx.type === 'income' || (tx.type === 'transfer' && tx.description.includes('(Entrada)'));
                  return (
                    <TableRow key={tx.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium whitespace-nowrap text-xs text-red-500">
                        {formatFullDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm line-clamp-1">{tx.description}</span>
                          <span className="text-xs text-muted-foreground">
                            {tx.account?.name || tx.creditCard?.name || 'Geral'} • {tx.category?.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-bold whitespace-nowrap text-sm ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
