"use client";

import { getAccounts } from "@/app/actions/accounts";
import { payFullInvoice, revertInvoicePayment } from "@/app/actions/credit-cards";
import { deleteTransaction, payVirtualTransaction, toggleTransactionStatus } from "@/app/actions/transactions";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownCircle,
  ArrowRightLeft,
  ArrowUpCircle,
  CheckCircle2,
  Circle,
  CreditCard,
  Loader2,
  MinusCircle,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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
import { Button } from "@/components/ui/button";
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
  creditCard?: { id: number; name: string; dueDay: number; closingDay: number } | null;
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
  const [invoiceToPay, setInvoiceToPay] = useState<TransactionWithRelations | null>(null);
  const [invoiceAccounts, setInvoiceAccounts] = useState<{ id: number; name: string; currentBalance: string | null }[]>(
    [],
  );
  const [invoiceSelectedAccount, setInvoiceSelectedAccount] = useState<string>("");
  const [isPayingInvoice, setIsPayingInvoice] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleToggleStatus = (tx: TransactionWithRelations) => {
    // Ignore grouped credit card invoices
    if (tx.isGroup && tx.creditCardId) {
      handleMarkAsPaid(tx);
      return;
    }

    setLoadingId(tx.id);
    startTransition(async () => {
      const isVirtual = tx.id < 0 && !tx.isGroup;

      const virtualData = isVirtual
        ? {
            type: tx.type,
            accountId: tx.accountId ?? null,
            creditCardId: tx.creditCardId ?? null,
            categoryId: tx.categoryId ?? 0,
            subcategoryId: tx.subcategoryId ?? null,
            amount: String(tx.amount),
            description: tx.description,
            date: tx.date,
            competencyMonth: tx.competencyMonth ?? "",
            fixedTransactionId: tx.fixedTransactionId ?? null,
          }
        : undefined;

      await toggleTransactionStatus(tx.id, tx.status, isVirtual, virtualData);
      setLoadingId(null);
    });
  };

  const handleDelete = async (mode: "single" | "future" = "single") => {
    if (!transactionToDelete) return;
    setIsDeleting(true);

    const isVirtual = transactionToDelete.id < 0 && !transactionToDelete.isGroup;
    const fixedId = transactionToDelete.fixedTransactionId ?? undefined;

    const result = await deleteTransaction(
      transactionToDelete.id,
      mode,
      isVirtual,
      fixedId,
      isVirtual ? transactionToDelete.date : undefined,
      isVirtual ? transactionToDelete.competencyMonth : undefined,
    );

    if (result && !result.success && result.error) {
      alert(result.error);
    }

    setIsDeleting(false);
    setTransactionToDelete(null);
  };

  const handleMarkAsPaid = async (tx: TransactionWithRelations) => {
    // Grouped credit card invoices
    if (tx.isGroup && tx.creditCardId) {
      if (tx.status === "paid") {
        setLoadingId(tx.id);
        await revertInvoicePayment(tx.creditCardId, tx.competencyMonth || "");
        setLoadingId(null);
      } else {
        // Open inline pay dialog for pending/partial
        setInvoiceToPay(tx);
        setInvoiceSelectedAccount("");
        setIsLoadingAccounts(true);
        getAccounts().then((accs) => {
          setInvoiceAccounts(accs);
          setIsLoadingAccounts(false);
        });
      }
      return;
    }

    setLoadingId(tx.id);
    if (tx.id < 0) {
      // Virtual transactions are implicitly "pending". Toggling means we mark them as paid.
      await payVirtualTransaction({
        type: tx.type,
        accountId: tx.accountId ?? null,
        creditCardId: tx.creditCardId ?? null,
        categoryId: tx.categoryId ?? 0,
        subcategoryId: tx.subcategoryId ?? null,
        amount: String(tx.amount),
        description: tx.description,
        date: tx.date,
        competencyMonth: tx.competencyMonth ?? "",
        fixedTransactionId: tx.fixedTransactionId ?? null,
      });
    } else {
      await toggleTransactionStatus(tx.id, tx.status);
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
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-green-500/10 shrink-0">
            <ArrowUpCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-500" />
          </div>
        );
      case "transfer":
        return (
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-blue-500/10 shrink-0">
            <ArrowRightLeft className="w-4 h-4 sm:w-6 sm:h-6 text-blue-500" />
          </div>
        );
      case "credit_card_expense":
        return (
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-orange-500/10 shrink-0">
            <CreditCard className="w-4 h-4 sm:w-6 sm:h-6 text-orange-500" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-destructive/10 shrink-0">
            <ArrowDownCircle className="w-4 h-4 sm:w-6 sm:h-6 text-destructive" />
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
      const grouped = new Map<string, TransactionWithRelations & { _pendingCount: number; _paidCount: number }>();
      const otherTxs: TransactionWithRelations[] = [];

      filteredTxs.forEach((tx) => {
        if (tx.type === "credit_card_expense" && tx.creditCardId && tx.competencyMonth) {
          const groupKey = `${tx.creditCardId}-${tx.competencyMonth}`;
          if (!grouped.has(groupKey)) {
            let groupDate = tx.date;

            const cardDueDay = tx.creditCard?.dueDay;
            if (cardDueDay) {
              groupDate = `${tx.competencyMonth}-${String(cardDueDay).padStart(2, "0")}`;
            }

            grouped.set(groupKey, {
              id: -(tx.creditCardId * 10000 + parseInt(tx.competencyMonth.replace("-", ""))), // id virtual determinístico
              isGroup: true,
              type: "expense",
              description: `Fatura: ${tx.creditCard?.name || "Cartão"}`,
              amount: 0,
              date: groupDate,
              status: tx.status,
              isFixed: null,
              installmentCurrent: null,
              installmentTotal: null,
              parentTransactionId: null,
              creditCardId: tx.creditCardId,
              competencyMonth: tx.competencyMonth,
              creditCard: tx.creditCard,
              category: { id: 0, name: "Fatura" },
              _pendingCount: 0,
              _paidCount: 0,
            });
          }
          const group = grouped.get(groupKey)!;
          group.amount = Number(group.amount) + Number(tx.amount);
          if (tx.status === "pending") group._pendingCount++;
          else if (tx.status === "paid") group._paidCount++;
        } else {
          otherTxs.push(tx);
        }
      });

      // Post-process groups for partial status
      for (const group of grouped.values()) {
        if (group._pendingCount > 0 && group._paidCount > 0) {
          group.status = "partial";
        } else if (group._pendingCount > 0) {
          group.status = "pending";
        } else if (group._paidCount > 0) {
          group.status = "paid";
        }
      }

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
        <div className="flex flex-col gap-2">
          {displayedTransactions.map((tx) => (
            <div
              key={tx.id}
              className="group flex items-center justify-between p-2 sm:p-3 rounded-xl hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 gap-1.5 sm:gap-4"
            >
              {/* Lado Esquerdo (Check, Ícone e Textos) */}
              <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-[2] sm:flex-1">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(tx)}
                  disabled={isPending && loadingId === tx.id}
                  className="shrink-0 transition-colors"
                >
                  {isPending && loadingId === tx.id ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-muted-foreground" />
                  ) : tx.status === "paid" ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                  ) : tx.status === "partial" ? (
                    <MinusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                  ) : (
                    <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
                {getIcon(tx.type)}
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-xs sm:text-base truncate leading-tight">{tx.description}</span>
                  <span className="text-[9px] sm:text-xs text-muted-foreground truncate mt-0.5">
                    {getSource(tx)} • {tx.category?.name || "Geral"}
                  </span>
                </div>
              </div>

              {/* Centro (Data/Status) */}
              <div className="hidden sm:flex flex-col items-center justify-center flex-1">
                <span className="text-sm text-muted-foreground">
                  {format(parseISO(tx.date), "dd 'de' MMM", { locale: ptBR })}
                </span>
                <button
                  onClick={() => handleMarkAsPaid(tx)}
                  disabled={loadingId === tx.id}
                  className={`mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full transition-colors ${
                    tx.status === "pending" || tx.status === "partial"
                      ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                      : "bg-green-500/10 text-green-500 hover:bg-green-500/20 group-hover:opacity-100"
                  }`}
                  title={tx.status === "paid" ? "Desfazer pagamento" : "Marcar como pago"}
                >
                  {loadingId === tx.id
                    ? "..."
                    : tx.status === "pending"
                      ? "Pendente"
                      : tx.status === "partial"
                        ? "Parcial"
                        : "Pago"}
                </button>
              </div>

              {/* Lado Direito (Valores e Ações) */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 shrink-0 justify-end">
                <div className="flex flex-col items-end">
                  <span
                    className={`font-semibold text-xs sm:text-base ${
                      tx.type === "income" || (tx.type === "transfer" && tx.description.includes("(Entrada)"))
                        ? "text-green-500"
                        : "text-destructive"
                    }`}
                  >
                    {tx.type === "income" || (tx.type === "transfer" && tx.description.includes("(Entrada)"))
                      ? "+"
                      : "-"}
                    {formatCurrency(tx.amount)}
                  </span>

                  {/* Somente visível no mobile onde o centro não aparece */}
                  <span className="sm:hidden flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
                    {format(parseISO(tx.date), "dd/MM")}
                    {(tx.status === "pending" || tx.status === "partial") && (
                      <button onClick={() => handleMarkAsPaid(tx)} className="text-amber-500 font-bold ml-1 uppercase">
                        {tx.status === "partial" ? "Parc." : "Pend."}
                      </button>
                    )}
                  </span>
                </div>

                {!tx.isGroup && (
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTransactionToEdit(tx)}
                      className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTransactionToDelete(tx)}
                      className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Trash className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                )}
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

      {/* Pay Grouped Invoice Dialog */}
      <AlertDialog
        open={!!invoiceToPay}
        onOpenChange={(open) => {
          if (!open) {
            setInvoiceToPay(null);
            setInvoiceSelectedAccount("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pagar Fatura</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme o pagamento da fatura <strong className="text-foreground">{invoiceToPay?.description}</strong>. O
              valor de <strong className="text-foreground">{formatCurrency(invoiceToPay?.amount ?? 0)}</strong> será
              debitado da conta selecionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-account">Conta Bancária de Origem</Label>
              {isLoadingAccounts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando contas...
                </div>
              ) : (
                <Select value={invoiceSelectedAccount} onValueChange={setInvoiceSelectedAccount}>
                  <SelectTrigger id="invoice-account">
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>
                        {acc.name} ({formatCurrency(Number(acc.currentBalance))})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPayingInvoice}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (!invoiceToPay?.creditCardId || !invoiceSelectedAccount || !invoiceToPay?.competencyMonth) return;
                setIsPayingInvoice(true);
                const result = await payFullInvoice(
                  invoiceToPay.creditCardId,
                  invoiceToPay.competencyMonth,
                  invoiceSelectedAccount,
                );
                setIsPayingInvoice(false);
                if (result.success) {
                  setInvoiceToPay(null);
                  setInvoiceSelectedAccount("");
                } else {
                  alert(result.error || "Erro ao pagar fatura");
                }
              }}
              disabled={!invoiceSelectedAccount || isPayingInvoice || isLoadingAccounts}
            >
              Confirmar Pagamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
