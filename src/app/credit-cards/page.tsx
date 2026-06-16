import { getCreditCardsWithSummary } from '@/app/actions/credit-cards';
import { getSettings } from '@/app/actions/settings';
import { CreditCardFormDialog } from './credit-card-form-dialog';
import { CreditCardsClientPage } from './credit-cards-client-page';
import { format } from 'date-fns';
import { Suspense } from 'react';

export const metadata = {
  title: 'Cartões | Minhas Finanças',
};

export default async function CreditCardsPage() {
  const settingsData = await getSettings();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const initialCards = await getCreditCardsWithSummary(currentMonth);
  
  return (
    <div className="container mx-auto p-4 md:p-8">
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
