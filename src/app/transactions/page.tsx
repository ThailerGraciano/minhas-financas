import { getTransactions } from '@/app/actions/transactions';
import { getSettings } from '@/app/actions/settings';
import { CompetencyFilter } from '@/components/competency-filter';
import { TransactionList } from './transaction-list';
import { format } from 'date-fns';
import { Suspense } from 'react';

export const metadata = {
  title: 'Transações | Minhas Finanças',
};

export default async function TransactionsPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const monthParam = searchParams?.month as string | undefined;
  
  const currentMonth = monthParam || format(new Date(), 'yyyy-MM');
  
  const [transactions, settingsData] = await Promise.all([
    getTransactions(currentMonth),
    getSettings(),
  ]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
        <Suspense fallback={null}>
          <CompetencyFilter closingDay={settingsData.closingDay} />
        </Suspense>
      </div>
      
      <TransactionList transactions={transactions} />
    </div>
  );
}
