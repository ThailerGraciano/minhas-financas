"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type Invoice = {
  card: {
    id: number;
    name: string;
    creditLimit: string | number;
    dueDay: number;
    closingDay: number;
  };
  invoiceTotal: number;
};

interface CreditCardInvoicesListProps {
  invoices: Invoice[];
}

export function CreditCardInvoicesList({ invoices }: CreditCardInvoicesListProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (invoices.length === 0) {
    return (
      <div className="flex h-[150px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-[2rem]">
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

  return (
    <div className="space-y-4">
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

        return (
          <div
            key={card.id}
            className="bg-card rounded-[2rem] p-5 shadow-sm border border-white/5 flex flex-col gap-4 relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-inner",
                    logoColor,
                  )}
                >
                  {card.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">{card.name}</span>
                  <span className="text-xs text-muted-foreground">Vence dia {card.dueDay}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-black text-lg">{formatCurrency(invoiceTotal)}</span>
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
  );
}
