'use client';

import { AccountList } from './account-list';
import { AccountFormDialog } from './account-form-dialog';

type Account = {
  id: number;
  name: string;
  type: string;
  currentBalance: string;
};

export function AccountsClientPage({ initialAccounts }: { initialAccounts: Account[] }) {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contas</h1>
            <p className="text-muted-foreground hidden md:block">Gerencie suas contas bancárias e saldos atuais.</p>
          </div>
          <AccountFormDialog />
        </div>
      </div>
      <AccountList accounts={initialAccounts} />
    </>
  );
}
