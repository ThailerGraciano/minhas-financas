import { getTransactions } from '@/app/actions/transactions';
import { getSettings } from '@/app/actions/settings';
import { getAccounts } from '@/app/actions/accounts';
import { TransactionsClientPage } from './transactions-client-page';
import { getDefaultCompetencyMonth } from '@/lib/date-utils';

export const metadata = {
  title: 'Transações | Minhas Finanças',
};

export default async function TransactionsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const accountIdParam = searchParams?.accountId;
  const accountId = accountIdParam ? Number(accountIdParam) : undefined;

  const settingsData = await getSettings();
  const currentMonth = getDefaultCompetencyMonth(settingsData.closingDay);
  
  const initialTransactions = await getTransactions(currentMonth, accountId);
  const accounts = await getAccounts();

  return (
    <div className="container mx-auto p-4 md:p-8">
      <TransactionsClientPage 
        closingDay={settingsData.closingDay}
        initialTransactions={initialTransactions}
        initialAccountId={accountId}
        accounts={accounts}
      />
    </div>
  );
}
