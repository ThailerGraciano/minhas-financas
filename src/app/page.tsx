import { getDashboardData, getBalancesByType, getBalanceEvolutionData, getInstallmentsChartData } from '@/app/actions/dashboard';
import { getSettings } from '@/app/actions/settings';
import { CompetencyFilter } from '@/components/competency-filter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle, CreditCard as CreditCardIcon, TrendingUp } from 'lucide-react';
import { Suspense } from 'react';
import { AccountBalancesSummary } from '@/components/account-balances-summary';
import { BalanceEvolutionChart, COLOR_PAST, COLOR_FUTURE } from '@/components/balance-evolution-chart';
import { InstallmentsStackedChart } from '@/components/installments-stacked-chart';
import { Layers } from 'lucide-react';

export default async function DashboardPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const monthParam = searchParams?.month as string | undefined;
  const currentMonth = monthParam || format(new Date(), 'yyyy-MM');

  const [data, settingsData, balancesData, evolutionData, installmentsData] = await Promise.all([
    getDashboardData(currentMonth),
    getSettings(),
    getBalancesByType(),
    getBalanceEvolutionData(),
    getInstallmentsChartData(),
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Suspense fallback={null}>
          <CompetencyFilter closingDay={settingsData.closingDay} />
        </Suspense>
      </div>

      <AccountBalancesSummary balances={balancesData.balancesByType} totalBalance={balancesData.totalBalance} />

      {/* Gráfico de Evolução de Saldo */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Evolução de Saldo</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Últimos 6 meses e projeção para os próximos 6
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <BalanceEvolutionChart data={evolutionData} />
          <div className="flex items-center gap-6 mt-3 px-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-6 h-0.5 rounded" style={{ background: COLOR_PAST }} />
              Saldo real
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <svg width="24" height="4" aria-hidden="true">
                <line x1="0" y1="2" x2="24" y2="2" stroke={COLOR_FUTURE} strokeWidth="2" strokeDasharray="6 4" />
              </svg>
              Projeção
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Parcelas */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <Layers className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Projeção de Parcelamentos</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acúmulo de faturas com compras parceladas
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <InstallmentsStackedChart data={installmentsData.data} keys={installmentsData.keys} />
        </CardContent>
      </Card>

      {/* Resumo do Mês */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas do Mês</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.totalIncome)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(data.totalExpense)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Contas e Faturas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Saldos por Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.accounts.map(acc => (
              <div key={acc.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                <span className="font-medium">{acc.name}</span>
                <span className={Number(acc.currentBalance) < 0 ? "text-red-500" : ""}>
                  {formatCurrency(Number(acc.currentBalance))}
                </span>
              </div>
            ))}
            {data.accounts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conta cadastrada.</p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Faturas Abertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.cardInvoices.map(invoice => (
              <div key={invoice.card.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <CreditCardIcon className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">{invoice.card.name}</span>
                </div>
                <span className="text-red-500 font-medium">{formatCurrency(invoice.invoiceTotal)}</span>
              </div>
            ))}
            {data.cardInvoices.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma fatura com gastos neste mês.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
