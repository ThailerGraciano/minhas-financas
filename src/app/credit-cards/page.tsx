import { getCreditCards } from '@/app/actions/credit-cards';
import { CreditCardFormDialog } from './credit-card-form-dialog';
import { CreditCardList } from './credit-card-list';

export const metadata = {
  title: 'Cartões | Minhas Finanças',
};

export default async function CreditCardsPage() {
  const cards = await getCreditCards();
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-row justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cartões</h1>
          <p className="text-muted-foreground hidden md:block">Gerencie seus limites e faturas.</p>
        </div>
        <CreditCardFormDialog />
      </div>
      
      <CreditCardList cards={cards} />
    </div>
  );
}
