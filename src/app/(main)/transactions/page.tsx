import { getTransactions } from '@/app/actions/transactions';
import { getSettings } from '@/app/actions/settings';
import { TransactionsClientPage } from './transactions-client-page';
import { getDefaultCompetencyMonth } from '@/lib/date-utils';

export const metadata = {
  title: 'Transações | Minhas Finanças',
};

export default async function TransactionsPage() {
  const settingsData = await getSettings();
  const currentMonth = getDefaultCompetencyMonth(settingsData.closingDay);
  
  const initialTransactions = await getTransactions(currentMonth);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <TransactionsClientPage 
        closingDay={settingsData.closingDay}
        initialTransactions={initialTransactions}
      />
    </div>
  );
}
