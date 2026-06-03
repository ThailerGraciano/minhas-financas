import { getTransactions } from '@/app/actions/transactions';
import { TransactionList } from './transaction-list';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const metadata = {
  title: 'Transações | Minhas Finanças',
};

// Utilizando abordagem segura para App Router / Next.js 15 em relação a searchParams
export default async function TransactionsPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const monthParam = searchParams?.month as string | undefined;
  
  const currentMonth = monthParam || format(new Date(), 'yyyy-MM');
  const transactions = await getTransactions(currentMonth);
  
  const monthName = format(new Date(`${currentMonth}-01`), 'MMMM yyyy', { locale: ptBR });

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
          <p className="text-muted-foreground capitalize">Competência: {monthName}</p>
        </div>
      </div>
      
      <TransactionList transactions={transactions} />
    </div>
  );
}
