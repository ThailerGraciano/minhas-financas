import { getCategories } from "@/app/actions/categories";
import { getCreditCard, getInvoiceSummary } from "@/app/actions/credit-cards";
import { Button } from "@/components/ui/button";
import { getDefaultCompetencyMonth } from "@/lib/date-utils";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceReconciliationView } from "./invoice-reconciliation-view";

export default async function ReconcileInvoicePage(props: {
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

  const [summary, categories] = await Promise.all([
    getInvoiceSummary(id, currentMonth),
    getCategories(),
  ]);

  return (
    <div className="container mx-auto px-0 py-2 sm:py-4 md:p-8 space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/credit-cards/${id}?month=${currentMonth}`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              Conciliação de Fatura — {card.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              Competência <strong>{currentMonth}</strong> • Importe CSV ou PDF para comparar com o aplicativo
            </p>
          </div>
        </div>
      </div>

      <InvoiceReconciliationView
        creditCardId={id}
        competencyMonth={currentMonth}
        currentTotal={summary.total_amount}
        isInvoicePaid={summary.total_amount > 0 && summary.pending_amount <= 0}
        categories={categories}
      />
    </div>
  );
}
