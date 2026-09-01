import { getCreditCardsWithSummary } from "@/app/actions/credit-cards";
import { getSettings } from "@/app/actions/settings";
import { getDefaultCompetencyMonth } from "@/lib/date-utils";
import { Suspense } from "react";
import { CreditCardFormDialog } from "./credit-card-form-dialog";
import { CreditCardsClientPage } from "./credit-cards-client-page";

export const metadata = {
  title: "Cartões | Minhas Finanças",
};

export default async function CreditCardsPage() {
  const settingsData = await getSettings();
  const currentMonth = getDefaultCompetencyMonth(settingsData.closingDay);
  const initialCards = await getCreditCardsWithSummary(currentMonth);

  return (
    <div className="container mx-auto px-0 py-4 md:p-8">
      <div className="flex flex-row justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cartões</h1>
          <p className="text-muted-foreground hidden md:block">Gerencie seus limites e faturas.</p>
        </div>
        <CreditCardFormDialog />
      </div>

      <Suspense fallback={null}>
        <CreditCardsClientPage closingDay={settingsData.closingDay} initialCards={initialCards} />
      </Suspense>
    </div>
  );
}
