"use client";

import { getDashboardFullData } from "@/app/actions/dashboard-full";
import { AccountBalancesSummary } from "@/components/account-balances-summary";
import { AccountsCarousel } from "@/components/accounts-carousel";
import { AdvancedAnalyticsSection } from "@/components/advanced-analytics-section";
import { BalanceEvolutionChart, COLOR_FUTURE, COLOR_PAST } from "@/components/balance-evolution-chart";
import { CategoryForecastChart } from "@/components/category-forecast-chart";
import { ExpenseTreemap } from "@/components/charts/ExpenseTreemap";
import { ClientDataLoader } from "@/components/client-data-loader";
import { CreditCardInvoicesList } from "@/components/credit-card-invoices-list";
import { EmergencyReserveCard } from "@/components/emergency-reserve-card";
import { ExpenseTypeComparison } from "@/components/expense-type-comparison";
import { ExpensesForecastChart } from "@/components/expenses-forecast-chart";
import { GoalsStashBlock } from "@/components/goals-stash-block";
import { InstallmentsStackedChart } from "@/components/installments-stacked-chart";
import { MonthlyBalanceGrid } from "@/components/monthly-balance-grid";
import { MonthlyFinancialHealth } from "@/components/monthly-financial-health";
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
  const [showBalance, setShowBalance] = useState(true);

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
              "px-3 py-1 rounded-full font-medium transition-all text-xs cursor-pointer",
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
              "px-3 py-1 rounded-full font-medium transition-all text-xs cursor-pointer",
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
      {(dashboard, selectedMonth) => {
        // Separação de contas operacionais vs caixinhas para não duplicar no AccountsCarousel
        const operationalAccounts = dashboard.data.accounts.filter((a) => {
          const lower = a.name.toLowerCase();
          return (
            a.type !== "stash" &&
            !lower.includes("reserva") &&
            !lower.includes("carro") &&
            !lower.includes("casa") &&
            !lower.includes("viagem") &&
            !lower.includes("meta")
          );
        });

        const carouselAccounts = operationalAccounts.length > 0 ? operationalAccounts : dashboard.data.accounts;

        return (
          <div className="space-y-6 mt-6">
            {/* ==================================================
                1. LINHA PRINCIPAL: Saúde do mês + Saldo Total + Reserva de Emergência
               ================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Saúde do Mês */}
              <div className="lg:col-span-1">
                <MonthlyFinancialHealth
                  totalIncome={dashboard.data.totalIncome}
                  totalExpense={dashboard.data.totalExpense}
                  expenseBreakdown={dashboard.data.expenseBreakdown}
                  showBalance={showBalance}
                />
              </div>

              {/* Saldo Total */}
              <div className="lg:col-span-1">
                <AccountBalancesSummary
                  totalBalance={dashboard.balancesData.totalBalance}
                  showBalance={showBalance}
                  onToggleShowBalance={() => setShowBalance(!showBalance)}
                />
              </div>

              {/* Reserva de Emergência */}
              <div className="lg:col-span-1">
                <EmergencyReserveCard reserveData={dashboard.data.reserveData} showBalance={showBalance} />
              </div>
            </div>

            {/* Totalizadores de Receitas e Despesas do Mês */}
            <MonthlyBalanceGrid
              totalIncome={dashboard.data.totalIncome}
              totalExpense={dashboard.data.totalExpense}
              showBalance={showBalance}
            />

            {/* ==================================================
                2. MINHAS CONTAS & CAIXAS (Operacionais)
               ================================================== */}
            {carouselAccounts && carouselAccounts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xl font-bold text-foreground">Minhas Contas & Caixas</h2>
                  <Link href="/accounts" className="text-xs text-primary font-medium hover:underline">
                    Ver todas
                  </Link>
                </div>
                <AccountsCarousel accounts={carouselAccounts} showBalance={showBalance} />
              </div>
            )}

            {/* ==================================================
                3. EVOLUÇÃO DE SALDO (12 Meses)
               ================================================== */}
            <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/5 shadow-sm w-full min-w-0">
              <div className="flex flex-row items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">Evolução de Saldo</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Histórico dos últimos 6 meses e projeção para os próximos 6
                  </p>
                </div>
              </div>
              <div>
                <BalanceEvolutionChart data={dashboard.evolutionData} showBalance={showBalance} />
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

            {/* ==================================================
                4. COMPROMETIMENTO & COMPOSIÇÃO DE DESPESAS (Fixas | Variáveis | Parceladas)
               ================================================== */}
            <ExpenseTypeComparison
              data={dashboard.forecastData}
              selectedMonth={selectedMonth}
              showBalance={showBalance}
            />

            {/* ==================================================
                5. PREVISÃO DE GASTOS
               ================================================== */}
            <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/5 shadow-sm w-full min-w-0">
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
                <ExpensesForecastChart data={dashboard.forecastData} showBalance={showBalance} />
              </div>
            </div>

            {/* ==================================================
                6. MAPEAMENTO DE DESPESAS (Treemap Proporcional)
               ================================================== */}
            <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/5 shadow-sm w-full min-w-0">
              <div className="flex flex-row items-center gap-2 mb-4">
                <Grid3X3 className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">Mapeamento de Despesas</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Distribuição proporcional de gastos por categoria neste mês
                  </p>
                </div>
              </div>
              <ExpenseTreemap data={dashboard.treemapData} showBalance={showBalance} />
            </div>

            {/* ==================================================
                7. FATURAS ABERTAS
               ================================================== */}
            <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/5 shadow-sm w-full min-w-0">
              <div className="flex flex-row items-center gap-2 mb-6">
                <CreditCardIcon className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">Faturas Abertas</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Acompanhe os gastos e limites dos seus cartões de crédito neste mês
                  </p>
                </div>
              </div>
              <CreditCardInvoicesList invoices={dashboard.data.cardInvoices} showBalance={showBalance} />
            </div>

            {/* ==================================================
                8. PROJEÇÃO DE PARCELAMENTOS
               ================================================== */}
            <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/5 shadow-sm w-full min-w-0">
              <div className="flex flex-row items-center gap-2 mb-4">
                <Layers className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">Projeção de Parcelamentos</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Acúmulo de faturas com compras parceladas e momentos de alívio
                  </p>
                </div>
              </div>
              <div>
                <InstallmentsStackedChart
                  data={dashboard.installmentsData.data}
                  keys={dashboard.installmentsData.keys}
                  showBalance={showBalance}
                />
              </div>
            </div>

            {/* ==================================================
                9. MINHAS CAIXINHAS / OBJETIVOS
               ================================================== */}
            {dashboard.data.stashAccounts && dashboard.data.stashAccounts.length > 0 && (
              <GoalsStashBlock stashAccounts={dashboard.data.stashAccounts} showBalance={showBalance} />
            )}

            {/* ==================================================
                10. PREVISÃO POR CATEGORIA (Análise Detalhada)
               ================================================== */}
            <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/5 shadow-sm w-full min-w-0">
              <div className="flex flex-row items-center gap-2 mb-4">
                <Grid3X3 className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">Previsão por Categoria</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Projeção de despesas categorizadas para os próximos 6 meses (clique na legenda para filtrar)
                  </p>
                </div>
              </div>
              <div>
                <CategoryForecastChart
                  data={dashboard.categoryForecastData.data}
                  keys={dashboard.categoryForecastData.keys}
                  showBalance={showBalance}
                />
              </div>
            </div>

            {/* ==================================================
                11. ANÁLISES AVANÇADAS (Seção Recolhível)
               ================================================== */}
            <AdvancedAnalyticsSection
              incomeVsExpenseData={dashboard.incomeVsExpenseData}
              selectedMonth={selectedMonth}
            />
          </div>
        );
      }}
    </ClientDataLoader>
  );
}
