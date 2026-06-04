import { getCreditCard } from '@/app/actions/credit-cards';
import { getCreditCardInvoices } from '@/app/actions/transactions';
import { CompetencyFilter } from '@/components/competency-filter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard as CreditCardIcon, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';

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

  const transactions = await getCreditCardInvoices(id, currentMonth);

  const totalInvoice = transactions.reduce((acc, t) => acc + Number(t.amount), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    // A string do banco vem como YYYY-MM-DD
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center gap-4 mb-2">
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
          <p className="text-muted-foreground text-sm">Visualização de faturas mensais</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
        <CompetencyFilter closingDay={card.closingDay} />
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total da Fatura</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalInvoice)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-muted-foreground" />
                Detalhes do Cartão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Limite Total</p>
                <p className="font-semibold">{formatCurrency(Number(card.creditLimit))}</p>
              </div>
              <div className="flex justify-between border-t pt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Dia de Fechamento</p>
                  <p className="font-medium">{card.closingDay}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Dia de Vencimento</p>
                  <p className="font-medium">{card.dueDay}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Despesas da Fatura - {currentMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
                  Nenhuma despesa registrada nesta fatura.
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                      <div className="flex flex-col">
                        <span className="font-medium">{tx.description}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{formatDate(tx.date)}</span>
                          <span>•</span>
                          <span className="bg-muted px-1.5 py-0.5 rounded-sm">{tx.category?.name}</span>
                        </div>
                      </div>
                      <div className="font-semibold text-red-500">
                        {formatCurrency(Number(tx.amount))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
