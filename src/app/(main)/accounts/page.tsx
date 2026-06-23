import { getAccounts } from '@/app/actions/accounts';
import { AccountFormDialog } from './account-form-dialog';
import { AccountList } from './account-list';

export const metadata = {
  title: 'Contas | Minhas Finanças',
};

export default async function AccountsPage() {
  const accounts = await getAccounts();
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-row justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas</h1>
          <p className="text-muted-foreground hidden md:block">Gerencie suas contas bancárias e carteiras.</p>
        </div>
        <AccountFormDialog />
      </div>
      
      <AccountList accounts={accounts} />
    </div>
  );
}
