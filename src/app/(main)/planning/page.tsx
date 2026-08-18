import { getAccounts } from "@/app/actions/accounts";
import { getProjectedCashFlow } from "@/app/actions/planning";
import { auth } from "@/auth";
import { CompetencyFilter } from "@/components/competency-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { getDefaultCompetencyMonth } from "@/lib/date-utils";
import { eq } from "drizzle-orm";
import { TrendingUp } from "lucide-react";
import { BalanceAllocator } from "./balance-allocator";
import { DayByDayForecast } from "./day-by-day-forecast";
import { PlanningChart } from "./planning-chart";
import { PlanningFilter } from "./planning-filter";
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
  const { projection, overdueTransactions } = await getProjectedCashFlow(accountId, competencyMonth);

  // Extract all transactions from projection to show in Payment Manager
  const allUpcomingTransactions = projection.flatMap((p) => p.transactions_of_the_day);

  const finalProjectedBalance = projection.length > 0 ? projection[projection.length - 1].projected_balance : 0;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            Planejamento Financeiro
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Projeção de fluxo de caixa e próximos compromissos</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <CompetencyFilter closingDay={closingDay} defaultMonth={currentCompMonth} />
          <PlanningFilter accounts={accounts} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            Curva de Saldo
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

      <BalanceAllocator projectedBalance={finalProjectedBalance} competencyMonth={competencyMonth} />
    </div>
  );
}
