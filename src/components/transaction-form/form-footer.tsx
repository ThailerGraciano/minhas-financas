import { type RecurrenceKind } from "./types";
import { type AccentColorConfig } from "@/components/transaction-theme";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Plus } from "lucide-react";
import React from "react";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export interface FormFooterProps {
  accent: AccentColorConfig;
  kind: RecurrenceKind;
  installment: string;
  totalInstallments: string;
  amount: number | undefined;
  monthlyAmount: number;
  pending: boolean;
  onSave: (close: boolean) => void;
}

export const FormFooter = React.memo(function FormFooter({
  accent,
  kind,
  installment,
  totalInstallments,
  amount,
  monthlyAmount,
  pending,
  onSave,
}: FormFooterProps) {
  return (
    <div
      className="shrink-0 px-4 sm:px-6 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:pb-3.5"
      style={{
        background: "rgba(17, 26, 42, 0.78)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 -10px 25px rgba(0, 0, 0, 0.35)",
      }}
    >
      {/* Operation summary pill */}
      <div
        className="mb-3.5 flex items-center justify-between rounded-xl px-3.5 py-2 text-xs transition-colors duration-300"
        style={{
          backgroundColor: "rgba(11, 18, 32, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        }}
      >
        <div className="flex items-center gap-2 truncate text-[#A7B3C5]">
          <span
            className="size-2 rounded-full shrink-0"
            style={{
              backgroundColor: accent.primary,
              boxShadow: `0 0 6px ${accent.primary}`,
            }}
          />
          <span className="font-medium text-[#F2F5FA]">{accent.name}</span>
          <span className="text-[#718096]">•</span>
          <span>
            {kind === "installment"
              ? `Parcelada (${installment}/${totalInstallments})`
              : kind === "fixed"
                ? "Fixa (Mensal)"
                : "Única"}
          </span>
        </div>
        <div
          className="shrink-0 font-semibold tabular-nums"
          style={{ color: accent.primary }}
        >
          {money(kind === "installment" ? monthlyAmount : amount || 0)}
          {kind === "installment" ? (
            <span className="text-xs font-normal text-[#A7B3C5]">/mês</span>
          ) : null}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => onSave(false)}
          className="h-11 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.10] active:bg-white/[0.15] text-[#F2F5FA] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all font-medium cursor-pointer"
        >
          <Plus className="mr-1.5 size-4" />
          Adicionar outra
        </Button>
        <Button
          type="button"
          disabled={pending}
          onClick={() => onSave(true)}
          className="h-11 rounded-xl text-[#0B1220] font-semibold transition-all cursor-pointer"
          style={{
            backgroundColor: accent.primary,
            boxShadow: `0 4px 18px ${accent.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.25)`,
          }}
        >
          {pending ? (
            <>
              <Loader2 className="mr-1.5 size-4 animate-spin text-[#0B1220]" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="mr-1.5 size-4" />
              Finalizar
            </>
          )}
        </Button>
      </div>
    </div>
  );
});

