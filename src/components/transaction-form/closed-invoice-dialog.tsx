import { type AccentColorConfig } from "@/components/transaction-theme";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import React from "react";

export interface ClosedInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accent: AccentColorConfig;
  onConfirm: () => void;
}

export const ClosedInvoiceDialog = React.memo(function ClosedInvoiceDialog({
  open,
  onOpenChange,
  accent,
  onConfirm,
}: ClosedInvoiceDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="z-[200] rounded-2xl border border-white/10 p-6 text-[#F2F5FA] shadow-2xl"
        style={{
          background: "rgba(21, 31, 49, 0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 24px 60px rgba(0, 0, 0, 0.8)",
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold text-[#F2F5FA]">
            Fatura já fechada
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-[#A7B3C5]">
            A fatura selecionada para este cartão já atingiu o dia de fechamento. Deseja realizar o lançamento mesmo assim?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel className="h-10 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.10] text-[#F2F5FA]">
            Voltar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="h-10 rounded-xl font-semibold text-[#0B1220]"
            style={{
              backgroundColor: accent.primary,
              boxShadow: `0 4px 16px ${accent.glow}`,
            }}
          >
            Lançar mesmo assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

