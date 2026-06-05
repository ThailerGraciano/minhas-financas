import { getProjectedCashFlow } from '@/app/actions/planning';
import { getAccounts } from '@/app/actions/accounts';
import { PlanningFilter } from './planning-filter';
import { PlanningChart } from './planning-chart';
import { DayByDayForecast } from './day-by-day-forecast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, WalletCards } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default async function PlanningPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const accountId = searchParams?.accountId as string | undefined;

  const accounts = await getAccounts();
  const projection = await getProjectedCashFlow(accountId);

  // Extract all transactions from projection to show in Payment Manager
  const allUpcomingTransactions = projection.flatMap(p => p.transactions_of_the_day);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDay = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            Planejamento Financeiro
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Projeção de fluxo de caixa e próximos compromissos
          </p>
        </div>
        <PlanningFilter accounts={accounts} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            Curva de Saldo (Próximos 30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PlanningChart data={projection} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Day-by-Day Forecast */}
        <DayByDayForecast projection={projection} />

        {/* Payment Manager */}
        <Card className="flex flex-col h-[600px]">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <WalletCards className="w-5 h-5 text-muted-foreground" />
              Próximos Lançamentos (Gerenciador)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {allUpcomingTransactions.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground border-t border-dashed">
                Nenhum lançamento previsto para os próximos 30 dias.
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUpcomingTransactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {formatDay(tx.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium line-clamp-1" title={tx.description}>{tx.description}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {tx.account?.name || 'Geral'} • {tx.category?.name}
                            </span>
                          </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
