'use client';

import { getTransactions } from '@/app/actions/transactions';
import { TransactionList } from './transaction-list';
import { ClientDataLoader } from '@/components/client-data-loader';

// Import the type inferred from the server action return, or you can import if exported
// In this case we use ReturnType for simplicity
type TransactionsData = Awaited<ReturnType<typeof getTransactions>>;

export function TransactionsClientPage({ closingDay, initialTransactions }: { closingDay: number; initialTransactions: TransactionsData }) {
  return (
    <ClientDataLoader
      closingDay={closingDay}
      initialData={initialTransactions}
      fetchAction={getTransactions}
      headerContent={<h1 className="text-3xl font-bold tracking-tight">Transações</h1>}
    >
      {(transactions) => (
        <TransactionList transactions={transactions} />
      )}
    </ClientDataLoader>
  );
}
