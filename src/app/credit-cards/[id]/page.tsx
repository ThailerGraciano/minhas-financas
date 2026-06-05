import { getCreditCard, getInvoiceSummary } from '@/app/actions/credit-cards';
import { getAccounts } from '@/app/actions/accounts';
import { CompetencyFilter } from '@/components/competency-filter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CreditCard as CreditCardIcon, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';
import { TransactionStatusToggle } from './transaction-status-toggle';
import { PayInvoiceDialog } from './pay-invoice-dialog';

export default async function CreditCardInvoicePage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const id = Number(params.id);

  if (isNaN(id)) {
    notFound();
  }

  const searchParams = await props.searchParams;
  const monthParam = searchParams?.month as string | undefined;
  const currentMonth = monthParam || format(new Date(), 'yyyy-MM');

  const card = await getCreditCard(id);

  if (!card) {
    notFound();
  }

  const summary = await getInvoiceSummary(id, currentMonth);
  const accounts = await getAccounts();

  const progressPercentage = summary.total_amount > 0 
    ? Math.round((summary.paid_amount / summary.total_amount) * 100) 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/credit-cards">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CreditCardIcon className="w-6 h-6 text-orange-500" />
              {card.name}
            </h1>
            <p className="text-muted-foreground text-sm">Gestão de faturas e pagamentos</p>
          </div>
        </div>
        
        <PayInvoiceDialog 
          creditCardId={id}
          competencyMonth={currentMonth}
          pendingAmount={summary.pending_amount}
          accounts={accounts}
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
        <CompetencyFilter closingDay={card.closingDay} />
      </div>

      {/* Visual Summary */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-muted-foreground" />
              Resumo do Cartão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Limite Total</p>
              <p className="font-semibold">{formatCurrency(Number(card.creditLimit))}</p>
            </div>
            <div className="flex justify-between border-t pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Fecha dia</p>
                <p className="font-medium text-sm">{card.closingDay}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Vence dia</p>
                <p className="font-medium text-sm">{card.dueDay}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status da Fatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Valor Total</p>
                <p className="text-xl font-bold">{formatCurrency(summary.total_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Valor Pago</p>
                <p className="text-xl font-bold text-green-500">{formatCurrency(summary.paid_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Restante a Pagar</p>
                <p className="text-xl font-bold text-red-500">{formatCurrency(summary.pending_amount)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Progresso do Pagamento</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Despesas da Fatura - {currentMonth}</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.transactions.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
              Nenhuma despesa registrada nesta fatura.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium whitespace-nowrap">{formatDate(tx.date)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{tx.description}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="bg-muted px-1.5 py-0.5 rounded-sm">{tx.category?.name || 'Sem categoria'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={`font-semibold ${tx.status === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrency(Number(tx.amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        <TransactionStatusToggle transactionId={tx.id} initialStatus={tx.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
