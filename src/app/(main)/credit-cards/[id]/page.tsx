import { getAccounts } from "@/app/actions/accounts";
import { getCreditCard, getInvoiceSummary } from "@/app/actions/credit-cards";
import { CompetencyFilter } from "@/components/competency-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDefaultCompetencyMonth } from "@/lib/date-utils";
import { ArrowLeft, CalendarClock, CreditCard as CreditCardIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdjustInvoiceDialog } from "./adjust-invoice-dialog";
import { ExportCSVButton } from "./export-csv-button";
import { InvoiceTransactionList } from "./invoice-transaction-list";
import { PayInvoiceDialog } from "./pay-invoice-dialog";
import { PrepayInvoiceDialog } from "./prepay-invoice-dialog";

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
  const card = await getCreditCard(id);

  if (!card) {
    notFound();
  }

  const currentMonth = monthParam || getDefaultCompetencyMonth(card.closingDay);

  const summary = await getInvoiceSummary(id, currentMonth);

  console.log("summary - ", summary);
  const accounts = await getAccounts();

  const progressPercentage =
    summary.total_amount > 0 ? Math.round((summary.paid_amount / summary.total_amount) * 100) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const [, month, day] = dateStr.split("-");
    return `${day}/${month}`;
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-8 space-y-6 max-w-5xl">
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

        <div className="flex flex-col sm:flex-row gap-2">
          <AdjustInvoiceDialog creditCardId={id} competencyMonth={currentMonth} totalAmount={summary.total_amount} />
          <PrepayInvoiceDialog
            creditCardId={id}
            competencyMonth={currentMonth}
            pendingAmount={summary.pending_amount}
            accounts={accounts}
          />
          <PayInvoiceDialog
            creditCardId={id}
            competencyMonth={currentMonth}
            pendingAmount={summary.pending_amount}
            accounts={accounts}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
        <CompetencyFilter closingDay={card.closingDay} defaultMonth={getDefaultCompetencyMonth(card.closingDay)} />
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
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs text-muted-foreground mb-1 truncate">Valor Total</p>
                <p className="text-sm md:text-xl font-bold truncate">{formatCurrency(summary.total_amount)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs text-muted-foreground mb-1 truncate">Valor Pago</p>
                <p className="text-sm md:text-xl font-bold text-green-500 truncate">
                  {formatCurrency(summary.paid_amount)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs text-muted-foreground mb-1 truncate" title="Restante a Pagar">
                  Restante
                </p>
                <p className="text-sm md:text-xl font-bold text-red-500 truncate">
                  {formatCurrency(summary.pending_amount)}
                </p>
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
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
          <CardTitle className="text-sm md:text-lg shrink-0">Despesas da Fatura - {currentMonth}</CardTitle>
          <ExportCSVButton transactions={summary.transactions} invoiceMonth={currentMonth} cardName={card.name} />
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0">
          {summary.transactions.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
              Nenhuma despesa registrada nesta fatura.
            </div>
          ) : (
            <InvoiceTransactionList transactions={summary.transactions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
