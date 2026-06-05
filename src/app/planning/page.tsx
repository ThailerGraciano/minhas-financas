import { getProjectedCashFlow } from '@/app/actions/planning';
import { getAccounts } from '@/app/actions/accounts';
import { PlanningFilter } from './planning-filter';
import { PlanningChart } from './planning-chart';
import { DayByDayForecast } from './day-by-day-forecast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UpcomingTransactionsManager } from './upcoming-transactions-manager';
import { TrendingUp } from 'lucide-react';

export default async function PlanningPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const accountId = searchParams?.accountId as string | undefined;

  const accounts = await getAccounts();
  const { projection, overdueTransactions } = await getProjectedCashFlow(accountId);

  // Extract all transactions from projection to show in Payment Manager
  const allUpcomingTransactions = projection.flatMap(p => p.transactions_of_the_day);

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
        <UpcomingTransactionsManager
          upcomingTransactions={allUpcomingTransactions}
          overdueTransactions={overdueTransactions}
        />
      </div>
    </div>
  );
}
