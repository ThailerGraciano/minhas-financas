'use client';

import { ClientDataLoader } from '@/components/client-data-loader';
import { getDashboardFullData } from '@/app/actions/dashboard-full';
import { AccountBalancesSummary } from '@/components/account-balances-summary';
import { BalanceEvolutionChart, COLOR_PAST, COLOR_FUTURE } from '@/components/balance-evolution-chart';
import { InstallmentsStackedChart } from '@/components/installments-stacked-chart';
import { ExpensesForecastChart } from '@/components/expenses-forecast-chart';
import { CategoryForecastChart } from '@/components/category-forecast-chart';
import { GlobalIncomeExpenseChart } from '@/components/global-income-expense-chart';
import { AccountIncomeExpenseChart } from '@/components/account-income-expense-chart';
import { AccountVsGlobalExpenseChart } from '@/components/account-vs-global-expense-chart';
import { PurchasingPowerChart } from '@/components/purchasing-power-chart';
import { ExpenseTreemap } from '@/components/charts/ExpenseTreemap';
import { ArrowUpCircle, ArrowDownCircle, CreditCard as CreditCardIcon, TrendingUp, Grid3X3, Layers } from 'lucide-react';

type DashboardFullData = Awaited<ReturnType<typeof getDashboardFullData>>;

export function DashboardClientPage({ closingDay, initialData }: { closingDay: number; initialData: DashboardFullData }) {
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <ClientDataLoader
      closingDay={closingDay}
      initialData={initialData}
      fetchAction={getDashboardFullData}
      headerContent={<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>}
    >
      {(dashboard, selectedMonth) => (
        <div className="space-y-6 mt-6">
          <AccountBalancesSummary balances={dashboard.balancesData.balancesByType} totalBalance={dashboard.balancesData.totalBalance} />

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
              <BalanceEvolutionChart data={dashboard.evolutionData} />
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
              <InstallmentsStackedChart data={dashboard.installmentsData.data} keys={dashboard.installmentsData.keys} />
            </div>
          </div>

          {/* Previsão de Gastos */}
          <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm w-full min-w-0">
            <div className="flex flex-row items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-xl font-bold">Previsão de Gastos</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Projeção de despesas variávies, fixas e parceladas para os próximos 6 meses
                </p>
              </div>
            </div>
            <div>
              <ExpensesForecastChart data={dashboard.forecastData} />
            </div>
          </div>

          {/* Previsão por Categoria */}
          <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm w-full min-w-0">
            <div className="flex flex-row items-center gap-2 mb-4">
              <Grid3X3 className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-xl font-bold">Previsão por Categoria</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Projeção de despesas categorizadas para os próximos 6 meses
                </p>
              </div>
            </div>
            <div>
              <CategoryForecastChart data={dashboard.categoryForecastData.data} keys={dashboard.categoryForecastData.keys} />
            </div>
          </div>

          {/* Resumo do Mês */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm flex flex-col space-y-4">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-muted-foreground">Receitas do Mês</span>
              </div>
              <div className="text-4xl font-bold text-green-500">{formatCurrency(dashboard.data.totalIncome)}</div>
            </div>

            <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm flex flex-col space-y-4">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-muted-foreground">Despesas do Mês</span>
              </div>
              <div className="text-4xl font-bold text-red-500">{formatCurrency(dashboard.data.totalExpense)}</div>
            </div>
          </div>

          {/* Gráficos Comparativos */}
          <div className="grid gap-6 lg:grid-cols-2">
            <GlobalIncomeExpenseChart initialData={dashboard.incomeVsExpenseData.global} competencyMonth={selectedMonth} />
            <AccountIncomeExpenseChart initialData={dashboard.incomeVsExpenseData.byAccount} competencyMonth={selectedMonth} />
          </div>

          {/* Gráficos Analíticos */}
          <div className="grid gap-6 lg:grid-cols-2">
            <PurchasingPowerChart initialData={dashboard.incomeVsExpenseData.byAccount} competencyMonth={selectedMonth} />
            <AccountVsGlobalExpenseChart initialData={dashboard.incomeVsExpenseData.accountVsGlobal} competencyMonth={selectedMonth} />
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
            <ExpenseTreemap data={dashboard.treemapData} />
          </div>

          {/* Contas e Faturas */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm w-full min-w-0">
              <h2 className="text-xl font-bold mb-4">Saldos por Conta</h2>
              <div className="space-y-4">
                {dashboard.data.accounts.map(acc => (
                  <div key={acc.id} className="flex justify-between items-center border-b border-muted/50 pb-3 last:border-0 last:pb-0">
                    <span className="font-medium">{acc.name}</span>
                    <span className={`font-bold ${Number(acc.currentBalance) < 0 ? "text-red-500" : ""}`}>
                      {formatCurrency(Number(acc.currentBalance))}
                    </span>
                  </div>
                ))}
                {dashboard.data.accounts.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">Nenhuma conta cadastrada.</p>
                )}
              </div>
            </div>

            <div className="bg-card rounded-[2rem] p-6 border-transparent shadow-sm w-full min-w-0">
              <h2 className="text-xl font-bold mb-4">Faturas Abertas</h2>
              <div className="space-y-4">
                {dashboard.data.cardInvoices.map(invoice => (
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
                {dashboard.data.cardInvoices.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">Nenhuma fatura com gastos neste mês.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ClientDataLoader>
  );
}
