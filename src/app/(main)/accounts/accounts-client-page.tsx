'use client';

import { getAccountsBalancesByCompetency } from '@/app/actions/accounts';
import { AccountList } from './account-list';
import { AccountFormDialog } from './account-form-dialog';
import { ClientDataLoader } from '@/components/client-data-loader';

type AccountsData = Awaited<ReturnType<typeof getAccountsBalancesByCompetency>>;

export function AccountsClientPage({ closingDay, initialAccounts }: { closingDay: number; initialAccounts: AccountsData }) {
  return (
    <ClientDataLoader
      closingDay={closingDay}
      initialData={initialAccounts}
      fetchAction={getAccountsBalancesByCompetency}
      headerContent={
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contas</h1>
            <p className="text-muted-foreground hidden md:block">Gerencie suas contas bancárias e saldos históricos.</p>
          </div>
          <AccountFormDialog />
        </div>
      }
    >
      {(accounts) => (
        <AccountList accounts={accounts} />
      )}
    </ClientDataLoader>
  );
}
