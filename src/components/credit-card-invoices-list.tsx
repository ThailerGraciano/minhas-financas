"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type InvoiceCard = {
  id: number;
  name: string;
  creditLimit: string | number;
  dueDay: number;
  closingDay: number;
  [key: string]: unknown;
};

export type Invoice = {
  card: InvoiceCard;
  invoiceTotal: number;
};

interface CreditCardInvoicesListProps {
  invoices: Invoice[];
  showBalance?: boolean;
}

export function CreditCardInvoicesList({ invoices, showBalance = true }: CreditCardInvoicesListProps) {
  const formatCurrency = (value: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const totalInvoices = invoices.reduce((acc, curr) => acc + curr.invoiceTotal, 0);

  if (invoices.length === 0) {
    return (
      <div className="flex h-[150px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-2xl">
        Nenhuma fatura com gastos neste mês.
      </div>
    );
  }

  const getInstitutionLogo = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("nubank")) return "bg-purple-600 text-white";
    if (lower.includes("mercado") || lower.includes("mp")) return "bg-blue-500 text-white";
    if (lower.includes("itau") || lower.includes("itaú")) return "bg-orange-500 text-white";
    if (lower.includes("inter")) return "bg-orange-600 text-white";
    if (lower.includes("c6")) return "bg-zinc-800 text-white";
    if (lower.includes("santander")) return "bg-red-600 text-white";
    if (lower.includes("bradesco")) return "bg-red-500 text-white";
    if (lower.includes("bb") || lower.includes("brasil")) return "bg-yellow-500 text-black";
    if (lower.includes("xp")) return "bg-black text-yellow-500";
    return "bg-primary text-primary-foreground";
  };

  const getRemainingDaysText = (closingDay: number, dueDay: number) => {
    const today = new Date();
    const currentDay = today.getDate();

    let daysUntilClosing = closingDay - currentDay;
    if (daysUntilClosing < 0) {
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      daysUntilClosing = daysInMonth - currentDay + closingDay;
    }

    let daysUntilDue = dueDay - currentDay;
    if (daysUntilDue < 0) {
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      daysUntilDue = daysInMonth - currentDay + dueDay;
    }

    if (daysUntilClosing === 0) {
      return `Fecha hoje • Vence em ${daysUntilDue} dias`;
    }
    if (daysUntilClosing === 1) {
      return `Fecha amanhã • Vence em ${daysUntilDue} dias`;
    }
    return `Fecha em ${daysUntilClosing} dias • Vence em ${daysUntilDue} dias`;
  };

  return (
    <div className="space-y-4">
      {/* Total das faturas abertas no cabeçalho */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Total das faturas abertas:</span>
          <span className="text-base sm:text-lg font-bold text-foreground tabular-nums">
            {formatCurrency(totalInvoices)}
          </span>
        </div>
        <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/20 bg-primary/10">
          {invoices.length} {invoices.length === 1 ? "cartão" : "cartões"}
        </Badge>
      </div>

      <div className="space-y-3">
        {invoices.map(({ card, invoiceTotal }) => {
          const limit = Number(card.creditLimit);
          const percentUsed = limit > 0 ? (invoiceTotal / limit) * 100 : 0;

          let progressColor = "[&>div]:bg-primary";
          let alertText = "";

          if (percentUsed >= 90) {
            progressColor = "[&>div]:bg-rose-500";
            alertText = "text-rose-500";
          } else if (percentUsed >= 75) {
            progressColor = "[&>div]:bg-amber-500";
            alertText = "text-amber-500";
          }

          const logoColor = getInstitutionLogo(card.name);
          const daysText = getRemainingDaysText(card.closingDay, card.dueDay);

          return (
            <div
              key={card.id}
              className="bg-card rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-5 shadow-sm border border-white/5 flex flex-col gap-3 relative overflow-hidden hover:border-white/10 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-sm shrink-0",
                      logoColor,
                    )}
                  >
                    {card.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-foreground truncate">{card.name}</span>
                    <span className="text-xs text-muted-foreground">{daysText}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="font-black text-base sm:text-lg text-foreground tabular-nums">
                    {formatCurrency(invoiceTotal)}
                  </span>
                  <span className={cn("text-xs font-semibold", alertText || "text-muted-foreground")}>
                    {percentUsed.toFixed(1)}% utilizado
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium px-1">
                  <span>Disponível: {formatCurrency(Math.max(0, limit - invoiceTotal))}</span>
                  <span>Limite: {formatCurrency(limit)}</span>
                </div>
                <Progress
                  value={Math.min(100, Math.max(0, percentUsed))}
                  className={cn("h-1.5 bg-muted/30", progressColor)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
