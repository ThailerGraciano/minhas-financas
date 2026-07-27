'use client';

import { getTransactions } from '@/app/actions/transactions';
import { TransactionList } from './transaction-list';
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

  const headerContent = (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
      <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
      <div className="w-full md:w-[250px]">
        <Select value={initialAccountId?.toString() || "all"} onValueChange={handleAccountChange}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Todas as contas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts.map(acc => (
              <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <ClientDataLoader
      closingDay={closingDay}
      initialData={initialTransactions}
      fetchAction={(month) => getTransactions(month, initialAccountId)}
      headerContent={headerContent}
    >
      {(transactions) => (
        <TransactionList transactions={transactions} />
      )}
    </ClientDataLoader>
  );
}
