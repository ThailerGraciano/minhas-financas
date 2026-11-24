"use client";

import { AlertTriangle, CheckCircle2, History, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { deleteLoan, DeleteLoanPaidAction } from "@/app/actions/loans";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export type DeletableLoanInfo = {
  id: string;
  name: string;
  type: string;
  totalAmount: number;
  totalPaid: number;
  hasPaidTransactions: boolean;
  hasInitialDisbursementPaid: boolean;
  paidInstallmentsCount: number;
  pendingInstallmentsCount: number;
};

type LoanDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: DeletableLoanInfo | null;
  onDeleted?: () => void;
};

export function LoanDeleteDialog({ open, onOpenChange, loan, onDeleted }: LoanDeleteDialogProps) {
  const [paidAction, setPaidAction] = useState<DeleteLoanPaidAction>("revert_and_delete");
  const [isDeleting, setIsDeleting] = useState(false);

  if (!loan) return null;

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      const actionToUse: DeleteLoanPaidAction = loan.hasPaidTransactions ? paidAction : "revert_and_delete";
      await deleteLoan(loan.id, actionToUse);

      toast.success(
        loan.hasPaidTransactions
          ? actionToUse === "revert_and_delete"
            ? "Empréstimo excluído e transações pagas estornadas!"
            : "Empréstimo e parcelas pendentes excluídos (transações pagas mantidas)!"
          : "Empréstimo excluído com sucesso!",
      );

      onOpenChange(false);
      onDeleted?.();
    } catch {
      toast.error("Erro ao excluir o empréstimo");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !isDeleting && onOpenChange(nextOpen)}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/25 text-red-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <AlertDialogTitle className="text-lg font-bold">Excluir empréstimo?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs mt-0.5">
                Contrato: <strong className="text-foreground">{loan.name}</strong>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-1 text-sm">
          <div className="rounded-2xl bg-muted/40 border border-white/[0.08] p-3.5 text-muted-foreground text-xs leading-relaxed">
            {loan.pendingInstallmentsCount > 0 ? (
              <span>
                O contrato e{" "}
                <strong className="text-foreground">
                  {loan.pendingInstallmentsCount}{" "}
                  {loan.pendingInstallmentsCount === 1 ? "parcela não paga" : "parcelas não pagas"}
                </strong>{" "}
                serão excluídos permanentemente.
              </span>
            ) : (
              <span>O contrato deste empréstimo não possui parcelas pendentes e será removido.</span>
            )}
          </div>

          {loan.hasPaidTransactions && (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Transações já pagas encontradas
                </p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {loan.hasInitialDisbursementPaid && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                      Entrada/Liberação inicial ({formatCurrency(loan.totalAmount)})
                    </span>
                  )}
                  {loan.paidInstallmentsCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                      {loan.paidInstallmentsCount}{" "}
                      {loan.paidInstallmentsCount === 1 ? "parcela paga" : "parcelas pagas"} (
                      {formatCurrency(loan.totalPaid)})
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground font-medium">
                O que você deseja fazer com os lançamentos já pagos?
              </p>

              <div className="grid gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaidAction("revert_and_delete")}
                  disabled={isDeleting}
                  className={cn(
                    "w-full text-left rounded-2xl p-3.5 border transition-all flex items-start gap-3",
                    paidAction === "revert_and_delete"
                      ? "bg-red-500/10 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.12)]"
                      : "bg-card/50 border-white/[0.08] hover:border-white/20",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                      paidAction === "revert_and_delete"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        Estornar e excluir transações pagas
                      </span>
                      {paidAction === "revert_and_delete" && (
                        <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Reverte o impacto financeiro no saldo das contas e apaga todos os lançamentos do empréstimo.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaidAction("keep")}
                  disabled={isDeleting}
                  className={cn(
                    "w-full text-left rounded-2xl p-3.5 border transition-all flex items-start gap-3",
                    paidAction === "keep"
                      ? "bg-primary/10 border-primary/40 shadow-[0_0_20px_rgba(130,10,209,0.15)]"
                      : "bg-card/50 border-white/[0.08] hover:border-white/20",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                      paidAction === "keep" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <History className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-foreground">Manter transações já pagas</span>
                      {paidAction === "keep" && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Preserva os lançamentos pagos no extrato e mantém o saldo atual das contas, excluindo apenas o
                      contrato e as parcelas pendentes.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting} className="gap-2">
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loan.hasPaidTransactions
              ? paidAction === "revert_and_delete"
                ? "Estornar e Excluir Tudo"
                : "Manter Pagas e Excluir Restante"
              : "Excluir Empréstimo"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
