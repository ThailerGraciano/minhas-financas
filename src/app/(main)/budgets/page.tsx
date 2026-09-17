import { BudgetsClientPage } from "@/app/(main)/budgets/budgets-client-page";
import { getBudgetData } from "@/app/actions/budgets";
import { auth } from "@/auth";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { getDefaultCompetencyMonth } from "@/lib/date-utils";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function BudgetsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [userSettings] = await db.select().from(settings).where(eq(settings.userId, session.user.id)).limit(1);

  const closingDay = userSettings?.closingDay || 25;
  const initialMonth = getDefaultCompetencyMonth(closingDay);
  const initialData = await getBudgetData(initialMonth);

  return <BudgetsClientPage initialData={initialData} closingDay={closingDay} />;
}
