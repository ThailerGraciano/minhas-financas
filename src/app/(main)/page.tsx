import { getDashboardData, getBalancesByType, getBalanceEvolutionData, getInstallmentsChartData, getIncomeVsExpenseData, getExpenseTreemapData } from '@/app/actions/dashboard';
import { getSettings } from '@/app/actions/settings';
import { CompetencyFilter } from '@/components/competency-filter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle, CreditCard as CreditCardIcon, TrendingUp, Grid3X3 } from 'lucide-react';
import { Suspense } from 'react';
import { AccountBalancesSummary } from '@/components/account-balances-summary';
import { BalanceEvolutionChart, COLOR_PAST, COLOR_FUTURE } from '@/components/balance-evolution-chart';
import { InstallmentsStackedChart } from '@/components/installments-stacked-chart';
import { GlobalIncomeExpenseChart } from '@/components/global-income-expense-chart';
import { AccountIncomeExpenseChart } from '@/components/account-income-expense-chart';
import { AccountVsGlobalExpenseChart } from '@/components/account-vs-global-expense-chart';
import { PurchasingPowerChart } from '@/components/purchasing-power-chart';
import { ExpenseTreemap } from '@/components/charts/ExpenseTreemap';
import { Layers } from 'lucide-react';

export default async function DashboardPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const monthParam = searchParams?.month as string | undefined;
  const currentMonth = monthParam || format(new Date(), 'yyyy-MM');

  const [data, settingsData, balancesData, evolutionData, installmentsData, incomeVsExpenseData, treemapData] = await Promise.all([
    getDashboardData(currentMonth),
    getSettings(),
    getBalancesByType(),
    getBalanceEvolutionData(),
    getInstallmentsChartData(),
    getIncomeVsExpenseData(currentMonth),
    getExpenseTreemapData(currentMonth),
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
      <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm w-full min-w-0">
        <div className="flex flex-row items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Evolução de Saldo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Últimos 6 meses e projeção para os próximos 6
            </p>
          </div>
        </div>
        <div>
          <BalanceEvolutionChart data={evolutionData} />
          <div className="flex items-center gap-6 mt-3 px-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-6 h-1 rounded" style={{ background: COLOR_PAST }} />
              Saldo real
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <svg width="24" height="4" aria-hidden="true">
                <line x1="0" y1="2" x2="24" y2="2" stroke={COLOR_FUTURE} strokeWidth="2" strokeDasharray="6 4" />
              </svg>
              Projeção
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Parcelas */}
      <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm w-full min-w-0">
        <div className="flex flex-row items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Projeção de Parcelamentos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acúmulo de faturas com compras parceladas
            </p>
          </div>
        </div>
        <div>
          <InstallmentsStackedChart data={installmentsData.data} keys={installmentsData.keys} />
        </div>
      </div>

      {/* Resumo do Mês */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm flex flex-col space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-muted-foreground">Receitas do Mês</span>
          </div>
          <div className="text-4xl font-bold text-green-500">{formatCurrency(data.totalIncome)}</div>
        </div>

        <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm flex flex-col space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-muted-foreground">Despesas do Mês</span>
          </div>
          <div className="text-4xl font-bold text-red-500">{formatCurrency(data.totalExpense)}</div>
        </div>
      </div>

      {/* Gráficos Comparativos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <GlobalIncomeExpenseChart initialData={incomeVsExpenseData.global} competencyMonth={currentMonth} />
        <AccountIncomeExpenseChart initialData={incomeVsExpenseData.byAccount} competencyMonth={currentMonth} />
      </div>

      {/* Gráficos Analíticos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PurchasingPowerChart initialData={incomeVsExpenseData.byAccount} competencyMonth={currentMonth} />
        <AccountVsGlobalExpenseChart initialData={incomeVsExpenseData.accountVsGlobal} competencyMonth={currentMonth} />
      </div>

      {/* Mapa de Despesas */}
      <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm w-full min-w-0">
        <div className="flex flex-row items-center gap-2 mb-4">
          <Grid3X3 className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Mapeamento de Despesas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visualize onde o seu dinheiro está sendo gasto neste mês
            </p>
          </div>
        </div>
        <ExpenseTreemap data={treemapData} />
      </div>

      {/* Contas e Faturas */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm w-full min-w-0">
          <h2 className="text-xl font-bold mb-4">Saldos por Conta</h2>
          <div className="space-y-4">
            {data.accounts.map(acc => (
              <div key={acc.id} className="flex justify-between items-center border-b border-muted/50 pb-3 last:border-0 last:pb-0">
                <span className="font-medium">{acc.name}</span>
                <span className={`font-bold ${Number(acc.currentBalance) < 0 ? "text-red-500" : ""}`}>
                  {formatCurrency(Number(acc.currentBalance))}
                </span>
              </div>
            ))}
            {data.accounts.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">Nenhuma conta cadastrada.</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm w-full min-w-0">
          <h2 className="text-xl font-bold mb-4">Faturas Abertas</h2>
          <div className="space-y-4">
            {data.cardInvoices.map(invoice => (
              <div key={invoice.card.id} className="flex justify-between items-center border-b border-muted/50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/10 p-2 rounded-full">
                    <CreditCardIcon className="h-5 w-5 text-orange-500" />
                  </div>
                  <span className="font-medium">{invoice.card.name}</span>
                </div>
                <span className="text-red-500 font-bold">{formatCurrency(invoice.invoiceTotal)}</span>
              </div>
            ))}
            {data.cardInvoices.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">Nenhuma fatura com gastos neste mês.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
