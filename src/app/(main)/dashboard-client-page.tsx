"use client";

import { getDashboardFullData } from "@/app/actions/dashboard-full";
import { AccountBalancesSummary } from "@/components/account-balances-summary";
import { AccountIncomeExpenseChart } from "@/components/account-income-expense-chart";
import { AccountVsGlobalExpenseChart } from "@/components/account-vs-global-expense-chart";
import { AccountsCarousel } from "@/components/accounts-carousel";
import { BalanceEvolutionChart, COLOR_FUTURE, COLOR_PAST } from "@/components/balance-evolution-chart";
import { CategoryForecastChart } from "@/components/category-forecast-chart";
import { ExpenseTreemap } from "@/components/charts/ExpenseTreemap";
import { ClientDataLoader } from "@/components/client-data-loader";
import { CreditCardInvoicesList } from "@/components/credit-card-invoices-list";
import { ExpensesForecastChart } from "@/components/expenses-forecast-chart";
import { GlobalIncomeExpenseChart } from "@/components/global-income-expense-chart";
import { InstallmentsStackedChart } from "@/components/installments-stacked-chart";
import { MonthlyBalanceGrid } from "@/components/monthly-balance-grid";
import { PurchasingPowerChart } from "@/components/purchasing-power-chart";
import { cn } from "@/lib/utils";
import { CreditCard as CreditCardIcon, Grid3X3, Layers, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

type DashboardFullData = Awaited<ReturnType<typeof getDashboardFullData>>;

export function DashboardClientPage({
  closingDay,
  initialData,
}: {
  closingDay: number;
  initialData: DashboardFullData;
}) {
  const [dateMode, setDateMode] = useState<"due_date" | "launch_date">("due_date");

  const fetchAction = useCallback((month: string) => getDashboardFullData(month, dateMode), [dateMode]);

  return (
    <ClientDataLoader
      closingDay={closingDay}
      initialData={initialData}
      fetchAction={fetchAction}
      headerContent={<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>}
      headerActions={
        <div className="flex items-center rounded-full bg-secondary p-1 text-xs border border-white/5">
          <button
            type="button"
            onClick={() => setDateMode("due_date")}
            className={cn(
              "px-3 py-1 rounded-full font-medium transition-all text-xs",
              dateMode === "due_date"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Vencimento (Caixa)
          </button>
          <button
            type="button"
            onClick={() => setDateMode("launch_date")}
            className={cn(
              "px-3 py-1 rounded-full font-medium transition-all text-xs",
              dateMode === "launch_date"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Lançamento (Consumo)
          </button>
        </div>
      }
    >
      {(dashboard, selectedMonth) => (
        <div className="space-y-6 mt-6">
          <AccountBalancesSummary totalBalance={dashboard.balancesData.totalBalance} />

          <MonthlyBalanceGrid totalIncome={dashboard.data.totalIncome} totalExpense={dashboard.data.totalExpense} />

          {/* Minhas Contas & Caixas */}
          {dashboard.data.accounts && dashboard.data.accounts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold text-foreground">Minhas Contas & Caixas</h2>
                <Link href="/accounts" className="text-xs text-primary font-medium hover:underline">
                  Ver todas
                </Link>
              </div>
              <AccountsCarousel accounts={dashboard.data.accounts} />
            </div>
          )}

          {/* Gráfico de Evolução de Saldo */}
          <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border-transparent shadow-sm w-full min-w-0">
            <div className="flex flex-row items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-xl font-bold">Evolução de Saldo</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Últimos 6 meses e projeção para os próximos 6</p>
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

          {/* Previsão de Gastos */}
          <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border-transparent shadow-sm w-full min-w-0">
            <div className="flex flex-row items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-xl font-bold">Previsão de Gastos</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Projeção de despesas variáveis, fixas e parceladas para os próximos 6 meses
                </p>
              </div>
            </div>
            <div>
              <ExpensesForecastChart data={dashboard.forecastData} />
            </div>
          </div>

          {/* Mapeamento de Despesas (Treemap Proporcional) */}
          <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border-transparent shadow-sm w-full min-w-0">
            <div className="flex flex-row items-center gap-2 mb-4">
              <Grid3X3 className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-xl font-bold">Mapeamento de Despesas</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Distribuição proporcional de gastos por categoria neste mês
                </p>
              </div>
            </div>
            <ExpenseTreemap data={dashboard.treemapData} />
          </div>

          {/* Faturas Abertas */}
          <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border-transparent shadow-sm w-full min-w-0">
            <div className="flex flex-row items-center gap-2 mb-6">
              <CreditCardIcon className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-xl font-bold">Faturas Abertas</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Acompanhe os gastos dos seus cartões de crédito neste mês
                </p>
              </div>
            </div>
            <CreditCardInvoicesList invoices={dashboard.data.cardInvoices} />
          </div>

          {/* Gráfico de Parcelas */}
          <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border-transparent shadow-sm w-full min-w-0">
            <div className="flex flex-row items-center gap-2 mb-4">
              <Layers className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-xl font-bold">Projeção de Parcelamentos</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Acúmulo de faturas com compras parceladas</p>
              </div>
            </div>
            <div>
              <InstallmentsStackedChart data={dashboard.installmentsData.data} keys={dashboard.installmentsData.keys} />
            </div>
          </div>

          {/* Previsão por Categoria */}
          <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border-transparent shadow-sm w-full min-w-0">
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
              <CategoryForecastChart
                data={dashboard.categoryForecastData.data}
                keys={dashboard.categoryForecastData.keys}
              />
            </div>
          </div>

          {/* Gráficos Comparativos */}
          <div className="grid gap-6 lg:grid-cols-2">
            <GlobalIncomeExpenseChart
              initialData={dashboard.incomeVsExpenseData.global}
              competencyMonth={selectedMonth}
            />
            <AccountIncomeExpenseChart
              initialData={dashboard.incomeVsExpenseData.byAccount}
              competencyMonth={selectedMonth}
            />
          </div>

          {/* Gráficos Analíticos */}
          <div className="grid gap-6 lg:grid-cols-2">
            <PurchasingPowerChart
              initialData={dashboard.incomeVsExpenseData.byAccount}
              competencyMonth={selectedMonth}
            />
            <AccountVsGlobalExpenseChart
              initialData={dashboard.incomeVsExpenseData.accountVsGlobal}
              competencyMonth={selectedMonth}
            />
          </div>
        </div>
      )}
    </ClientDataLoader>
  );
}
