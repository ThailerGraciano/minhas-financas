import { GlassCard } from "./glass-card";
import { type AccentColorConfig, type TransactionTab } from "@/components/transaction-theme";
import { CurrencyInput } from "@/components/ui/currency-input";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock } from "lucide-react";
import React from "react";

export interface AmountCardProps {
  amount: number | undefined;
  onAmountChange: (value: number | undefined) => void;
  tab: TransactionTab;
  accent: AccentColorConfig;
  canShowStatus: boolean;
  isPaid: boolean;
  onToggleStatus: () => void;
}

export const AmountCard = React.memo(function AmountCard({
  amount,
  onAmountChange,
  tab,
  accent,
  canShowStatus,
  isPaid,
  onToggleStatus,
}: AmountCardProps) {
  return (
    <GlassCard elevated>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Valor da transação
        </span>
        {canShowStatus && (
          <button
            type="button"
            onClick={onToggleStatus}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer",
              isPaid
                ? "bg-[#132A28]/90 text-[#42D6A0] border-[#28634F] shadow-[0_0_12px_rgba(66,214,160,0.15)]"
                : "bg-[#2A2215]/90 text-[#F59E0B] border-[#5E441D] shadow-[0_0_12px_rgba(245,158,11,0.15)]"
            )}
          >
            {isPaid ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
            <span>{isPaid ? (tab === "income" ? "Recebido" : "Pago") : "Pendente"}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-3xl sm:text-4xl font-bold tabular-nums transition-colors duration-300"
          style={{ color: accent.primary }}
        >
          R$
        </span>
        <CurrencyInput
          name="amount"
          value={amount}
          onValueChange={onAmountChange}
          className="h-12 min-w-0 text-3xl sm:text-4xl font-bold tabular-nums bg-transparent border-0 p-0 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:outline-none"
          placeholder="0,00"
          autoFocus
        />
      </div>
    </GlassCard>
  );
});

