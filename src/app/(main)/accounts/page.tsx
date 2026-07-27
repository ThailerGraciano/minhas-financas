import { getAccountsBalancesByCompetency } from '@/app/actions/accounts';
import { getSettings } from '@/app/actions/settings';
import { getDefaultCompetencyMonth } from '@/lib/date-utils';
import { AccountsClientPage } from './accounts-client-page';

export const metadata = {
  title: 'Contas | Minhas Finanças',
};

export default async function AccountsPage() {
  const settingsData = await getSettings();
  const currentMonth = getDefaultCompetencyMonth(settingsData.closingDay);
  
  const initialAccounts = await getAccountsBalancesByCompetency(currentMonth);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <AccountsClientPage 
        closingDay={settingsData.closingDay}
        initialAccounts={initialAccounts}
      />
    </div>
  );
}
