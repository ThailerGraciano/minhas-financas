import { getDashboardData } from '@/app/actions/dashboard';
import { getSettings } from '@/app/actions/settings';
import { CompetencyFilter } from '@/components/competency-filter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle, Wallet, CreditCard as CreditCardIcon } from 'lucide-react';
import { Suspense } from 'react';

export default async function DashboardPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const monthParam = searchParams?.month as string | undefined;
  const currentMonth = monthParam || format(new Date(), 'yyyy-MM');

  const [data, settingsData] = await Promise.all([
    getDashboardData(currentMonth),
    getSettings(),
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Suspense fallback={null}>
          <CompetencyFilter closingDay={settingsData.closingDay} />
        </Suspense>
      </div>

      {/* Resumo do Mês */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Consolidado</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(data.totalBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">Soma de todas as contas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas do Mês</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.totalIncome)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(data.totalExpense)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Contas e Faturas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Saldos por Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.accounts.map(acc => (
              <div key={acc.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                <span className="font-medium">{acc.name}</span>
                <span className={Number(acc.currentBalance) < 0 ? "text-red-500" : ""}>
                  {formatCurrency(Number(acc.currentBalance))}
                </span>
              </div>
            ))}
            {data.accounts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conta cadastrada.</p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Faturas Abertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.cardInvoices.map(invoice => (
              <div key={invoice.card.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <CreditCardIcon className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">{invoice.card.name}</span>
                </div>
                <span className="text-red-500 font-medium">{formatCurrency(invoice.invoiceTotal)}</span>
              </div>
            ))}
            {data.cardInvoices.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma fatura com gastos neste mês.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
