import { getAccounts } from "@/app/actions/accounts";
import { getProjectedCashFlow } from "@/app/actions/planning";
import { auth } from "@/auth";
import { PlanningTemporalNav } from "@/components/planning-temporal-nav";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { getDefaultCompetencyMonth } from "@/lib/date-utils";
import { eq } from "drizzle-orm";
import { BalanceAllocator } from "./balance-allocator";
import { DayByDayForecast } from "./day-by-day-forecast";
import { PlanningChart } from "./planning-chart";
import { UpcomingTransactionsManager } from "./upcoming-transactions-manager";

export default async function PlanningPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  let accountId = searchParams?.accountId as string | undefined;
  const month = searchParams?.month as string | undefined;

  if (!accountId) {
    accountId = "checking_accounts";
  } else if (accountId === "all") {
    accountId = undefined;
  }

  const session = await auth();
  let closingDay = 25;
  if (session?.user?.id) {
    const [appSettings] = await db.select().from(settings).where(eq(settings.userId, session.user.id)).limit(1);
    if (appSettings) {
      closingDay = appSettings.closingDay;
    }
  }

  const currentCompMonth = getDefaultCompetencyMonth(closingDay);
  const competencyMonth = month || currentCompMonth;

  const accounts = await getAccounts();
  const { chartData, projection, overdueTransactions } = await getProjectedCashFlow(accountId, competencyMonth);

  // Extract all transactions from projection to show in Payment Manager
  const allUpcomingTransactions = projection.flatMap((p) => p.transactions_of_the_day);

  const finalProjectedBalance = projection.length > 0 ? projection[projection.length - 1].projected_balance : 0;

  return (
    <div className="container mx-auto px-1 sm:px-4 py-3 md:p-6 space-y-6 max-w-6xl pb-24 md:pb-12">
      {/* Título da Página no Desktop (No mobile fica no cabeçalho fixo superior) */}
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">Planejamento</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestão e projeções financeiras do período.</p>
      </div>

      {/* 2. Navegação Temporal: Seletor em Pílula + Considerar Saldo da Conta */}
      <PlanningTemporalNav closingDay={closingDay} defaultMonth={currentCompMonth} accounts={accounts} />

      {/* 3. Card e Gráfico da Curva de Saldo com Alta Fidelidade */}
      <PlanningChart data={chartData} />

      {/* 4. Previsão Dia a Dia (Carrossel e Resumo) e Próximos Lançamentos */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <DayByDayForecast projection={projection} />
        <UpcomingTransactionsManager
          upcomingTransactions={allUpcomingTransactions}
          overdueTransactions={overdueTransactions}
        />
      </div>

      {/* 5. Painel de Distribuição Sugerida */}
      <BalanceAllocator projectedBalance={finalProjectedBalance} competencyMonth={competencyMonth} />
    </div>
  );
}
