"use client";

import { markTransactionAsPaid, payVirtualTransaction } from "@/app/actions/transactions";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownCircle, ArrowRightLeft, ArrowUpCircle, CheckCircle2, Circle, CreditCard } from "lucide-react";
import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { deleteTransaction } from "@/app/actions/transactions";
import { EditTransactionDialog } from "@/components/edit-transaction-dialog";
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
import { Pencil, Trash } from "lucide-react";

export type TransactionWithRelations = {
  id: number;
  description: string;
  amount: string | number;
  date: string;
  type: string;
  status: string;
  isFixed: boolean | null;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  parentTransactionId: number | null;
  fixedTransactionId?: string | null;
  competencyMonth?: string;
  accountId?: number | null;
  creditCardId?: number | null;
  categoryId?: number;
  subcategoryId?: number | null;
  isGroup?: boolean;
  account?: { id: number; name: string } | null;
  creditCard?: { id: number; name: string } | null;
  category?: { id: number; name: string; icon?: string | null } | null;
  subcategory?: { id: number; name: string } | null;
};

export function TransactionList({ transactions }: { transactions: TransactionWithRelations[] }) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [groupCreditCards, setGroupCreditCards] = useState(true);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionWithRelations | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortBy, setSortBy] = useState("date_desc");
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  const handleDelete = async (mode: "single" | "future" = "single") => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    await deleteTransaction(transactionToDelete.id, mode);
    setIsDeleting(false);
    setTransactionToDelete(null);
  };

  const handleMarkAsPaid = async (tx: TransactionWithRelations) => {
    if (tx.status === "paid") return; // already paid

    setLoadingId(tx.id);
    if (tx.id < 0) {
      await payVirtualTransaction({
        type: tx.type,
        accountId: tx.accountId ?? null,
        creditCardId: tx.creditCardId ?? null,
        categoryId: tx.categoryId ?? 0,
        subcategoryId: tx.subcategoryId ?? null,
        amount: String(tx.amount),
        description: tx.description,
        date: tx.date,
        competencyMonth: tx.competencyMonth ?? '',
        fixedTransactionId: tx.fixedTransactionId ?? null,
      });
    } else {
      await markTransactionAsPaid(tx.id);
    }
    setLoadingId(null);
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "income":
        return (
          <div className="hidden md:flex items-center justify-center bg-green-500/10 p-1.5 md:p-2.5 rounded-full shrink-0">
            <ArrowUpCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
          </div>
        );
      case "transfer":
        return (
          <div className="hidden md:flex items-center justify-center bg-blue-500/10 p-1.5 md:p-2.5 rounded-full shrink-0">
            <ArrowRightLeft className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
          </div>
        );
      case "credit_card_expense":
        return (
          <div className="hidden md:flex items-center justify-center bg-orange-500/10 p-1.5 md:p-2.5 rounded-full shrink-0">
            <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
          </div>
        );
      default:
        return (
          <div className="hidden md:flex items-center justify-center bg-red-500/10 p-1.5 md:p-2.5 rounded-full shrink-0">
            <ArrowDownCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
          </div>
        );
    }
  };

  const getSource = (tx: TransactionWithRelations) => {
    if (tx.type === "credit_card_expense" && tx.creditCard) {
      return tx.creditCard.name;
    }
    if (tx.account) {
      return tx.account.name;
    }
    return "Geral";
  };

  const displayedTransactions = useMemo(() => {
    let filteredTxs = transactions;
    if (showOnlyPending) {
      filteredTxs = transactions.filter((tx) => tx.status === "pending");
    }

    let processedTxs = filteredTxs;

    if (groupCreditCards) {
      const grouped = new Map<number, TransactionWithRelations>();
      const otherTxs: TransactionWithRelations[] = [];

      filteredTxs.forEach((tx) => {
        if (tx.type === "credit_card_expense" && tx.creditCardId) {
          if (!grouped.has(tx.creditCardId)) {
            grouped.set(tx.creditCardId, {
              id: -(tx.creditCardId + 900000),
              isGroup: true,
              type: "expense",
              description: `Fatura: ${tx.creditCard?.name || "Cartão"}`,
              amount: 0,
              date: tx.date,
              status: tx.status,
              isFixed: null,
              installmentCurrent: null,
              installmentTotal: null,
              parentTransactionId: null,
              creditCard: tx.creditCard,
              category: { id: 0, name: "Fatura" },
            });
          }
          const group = grouped.get(tx.creditCardId)!;
          group.amount = Number(group.amount) + Number(tx.amount);
          if (tx.status === "pending") group.status = "pending";

          if (new Date(tx.date) > new Date(group.date)) {
            group.date = tx.date;
          }
        } else {
          otherTxs.push(tx);
        }
      });
      processedTxs = [...otherTxs, ...Array.from(grouped.values())];
    }

    return [...processedTxs].sort((a, b) => {
      if (sortBy === "date_desc") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === "date_asc") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === "amount_desc") {
        return Number(b.amount) - Number(a.amount);
      }
      if (sortBy === "amount_asc") {
        return Number(a.amount) - Number(b.amount);
      }
      return 0;
    });
  }, [transactions, groupCreditCards, showOnlyPending, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-3 px-4 md:px-6 rounded-2xl md:rounded-full border-transparent bg-card shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-by" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Ordenar por:
            </Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sort-by" className="w-[180px] h-9 bg-background rounded-full border-transparent">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Data (Mais recente)</SelectItem>
                <SelectItem value="date_asc">Data (Mais antiga)</SelectItem>
                <SelectItem value="amount_desc">Valor (Maior)</SelectItem>
                <SelectItem value="amount_asc">Valor (Menor)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <Switch id="show-only-pending" checked={showOnlyPending} onCheckedChange={setShowOnlyPending} />
            <Label htmlFor="show-only-pending" className="text-sm font-medium cursor-pointer">
              Apenas não pagas
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="group-cc" checked={groupCreditCards} onCheckedChange={setGroupCreditCards} />
            <Label htmlFor="group-cc" className="text-sm font-medium cursor-pointer">
              Agrupar faturas de cartão
            </Label>
          </div>
        </div>
      </div>

      {displayedTransactions.length === 0 ? (
        <div className="text-center p-12 border rounded-lg border-dashed text-muted-foreground bg-muted/20">
          Nenhuma transação encontrada para este período.
        </div>
      ) : (
        <div className="space-y-4">
          {displayedTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-card rounded-[1.5rem] border-transparent shadow-sm transition-all hover:bg-card/80 mb-3"
            >
              <div className="p-3 md:p-5 flex items-center justify-between gap-2 md:gap-3">
                <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                  <button
                    onClick={() => handleMarkAsPaid(tx)}
                    disabled={loadingId === tx.id || tx.status === "paid"}
                    className="shrink-0 focus:outline-none disabled:opacity-50 transition-transform hover:scale-110"
                    title={tx.status === "paid" ? "Pago" : "Marcar como Pago"}
                  >
                    {loadingId === tx.id ? (
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : tx.status === "paid" ? (
                      <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
                    )}
                  </button>

                  {getIcon(tx.type)}

                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm md:text-base truncate">{tx.description}</span>
                    <span className="text-[11px] md:text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <span className="truncate max-w-[70px] md:max-w-none">{getSource(tx)}</span>
                      <span className="mx-0.5 md:mx-1">•</span>
                      <span className="truncate max-w-[70px] md:max-w-none">{tx.category?.name || "Geral"}</span>
                      {tx.installmentTotal && tx.installmentTotal > 1 && (
                        <span className="ml-1 text-primary">
                          ({tx.installmentCurrent}/{tx.installmentTotal})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                  <div className="flex flex-col items-end text-right">
                    <span className={`font-bold text-sm md:text-base ${tx.type === "income" ? "text-green-600" : "text-foreground"}`}>
                      {tx.type === "income" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </span>
                    <span className="text-[11px] md:text-xs text-muted-foreground">
                      {format(parseISO(tx.date), "dd 'de' MMM", { locale: ptBR })}
                    </span>
                  </div>

                  {!tx.isGroup && (
                    <div className="flex items-center gap-0.5 md:gap-1">
                      <button
                        onClick={() => setTransactionToEdit(tx)}
                        className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors focus:outline-none"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                      </button>
                      <button
                        onClick={() => setTransactionToDelete(tx)}
                        className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors focus:outline-none"
                        title="Excluir"
                      >
                        <Trash className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <EditTransactionDialog
        transaction={transactionToEdit}
        open={!!transactionToEdit}
        onOpenChange={(open) => !open && setTransactionToEdit(null)}
      />

      {/* Delete Alert */}
      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent className="sm:max-w-[500px]">
          {transactionToDelete &&
          (transactionToDelete.fixedTransactionId ||
            (transactionToDelete.installmentTotal && transactionToDelete.installmentTotal > 1)) ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir transação recorrente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta transação faz parte de uma série recorrente ou parcelada. Deseja excluir apenas esta parcela ou
                  esta e todas as próximas?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 flex-wrap sm:justify-end">
                <AlertDialogCancel disabled={isDeleting} className="cursor-pointer">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete("single");
                  }}
                  disabled={isDeleting}
                  className="border border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground cursor-pointer"
                >
                  Apenas esta
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete("future");
                  }}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
                >
                  {isDeleting ? "Excluindo..." : "Esta e as próximas"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta transação permanentemente? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete("single");
                  }}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
                >
                  {isDeleting ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
