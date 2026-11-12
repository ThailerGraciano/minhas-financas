'use client';

import { useCallback } from 'react';

import { getTransactions } from '@/app/actions/transactions';
import { TransactionList } from './transaction-list';
import { TransactionSummaryCards } from './transaction-summary-cards';
import { ClientDataLoader } from '@/components/client-data-loader';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Import the type inferred from the server action return, or you can import if exported
// In this case we use ReturnType for simplicity
type TransactionsData = Awaited<ReturnType<typeof getTransactions>>;

export function TransactionsClientPage({ 
  closingDay, 
  initialTransactions,
  initialAccountId,
  accounts
}: { 
  closingDay: number; 
  initialTransactions: TransactionsData;
  initialAccountId?: number;
  accounts: { id: number; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleAccountChange = (value: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (value === "all") {
      current.delete("accountId");
    } else {
      current.set("accountId", value);
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  const renderHeader = (transactions: TransactionsData) => {
    const totalCount = transactions.length;

    return (
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md whitespace-nowrap">
            {totalCount} {totalCount === 1 ? "lançamento" : "lançamentos"}
          </span>
        </div>
        <div className="w-full md:w-auto">
          <Select value={initialAccountId?.toString() || "all"} onValueChange={handleAccountChange}>
            <SelectTrigger className="w-full md:w-[200px] bg-white/[0.03] border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md rounded-xl h-10 hover:bg-white/[0.06] hover:border-white/20 transition-all">
              <SelectValue placeholder="Todas as contas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id.toString()}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const fetchTransactions = useCallback(
    (month: string) => getTransactions(month, initialAccountId),
    [initialAccountId]
  );

  return (
    <ClientDataLoader
      closingDay={closingDay}
      initialData={initialTransactions}
      fetchAction={fetchTransactions}
      headerContent={renderHeader}
    >
      {(transactions) => (
        <div>
          <TransactionSummaryCards transactions={transactions} accountId={initialAccountId} />
          <TransactionList transactions={transactions} />
        </div>
      )}
    </ClientDataLoader>
  );
}
