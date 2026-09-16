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
import { Badge } from "@/components/ui/badge";
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
import { Pencil, Trash, Filter } from "lucide-react";

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
  invoiceMonth?: string | null;
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

  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");

  const categoriesData = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    transactions.forEach((tx) => {
      const catName = tx.category?.name || "Sem Categoria";
      map.set(catName, (map.get(catName) || 0) + 1);
      total++;
    });
    return {
      total,
      list: Array.from(map.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [transactions]);

  const displayedTransactions = useMemo(() => {
    let filteredTxs = transactions;
    
    if (selectedCategory !== "Todas") {
      filteredTxs = filteredTxs.filter((tx) => (tx.category?.name || "Sem Categoria") === selectedCategory);
    }
    
    if (showOnlyPending) {
      filteredTxs = filteredTxs.filter((tx) => tx.status === "pending");
    }

    let processedTxs = filteredTxs;

    if (groupCreditCards) {
      const grouped = new Map<string, TransactionWithRelations & { _pendingCount: number; _paidCount: number }>();
      const otherTxs: TransactionWithRelations[] = [];

            filteredTxs.forEach((tx) => {
        if (tx.type === "credit_card_expense" && tx.creditCardId) {
          const groupKey = `${tx.creditCardId}`;
          if (!grouped.has(groupKey)) {
            let groupDate = tx.date;

            const cardDueDay = tx.creditCard?.dueDay;
            if (cardDueDay) {
              const invoiceMonthToUse = tx.invoiceMonth || tx.competencyMonth || "";
              groupDate = `${invoiceMonthToUse}-${String(cardDueDay).padStart(2, "0")}`;
            }

            grouped.set(groupKey, {
              id: -(tx.creditCardId * 10000 + parseInt((tx.invoiceMonth || tx.competencyMonth || "0").replace("-", ""))), // id virtual determinístico
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
              invoiceMonth: tx.invoiceMonth,
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
  }, [transactions, groupCreditCards, showOnlyPending, sortBy, selectedCategory]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, TransactionWithRelations[]> = {};
    const order: string[] = [];
    
    displayedTransactions.forEach((tx) => {
      const dateKey = tx.date.split("T")[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
        order.push(dateKey);
      }
      groups[dateKey].push(tx);
    });

    return order.map((date) => ({
      date,
      transactions: groups[date],
    }));
  }, [displayedTransactions]);

  return (
    <div className="space-y-6">
      {/* 1. Chips de Categoria */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
        <Button
          variant={selectedCategory === "Todas" ? "default" : "outline"}
          className={`rounded-full shrink-0 ${
            selectedCategory === "Todas" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""
          }`}
          onClick={() => setSelectedCategory("Todas")}
        >
          Todas ({categoriesData.total})
        </Button>
        {categoriesData.list.map(([catName, count]) => (
          <Button
            key={catName}
            variant={selectedCategory === catName ? "default" : "outline"}
            className={`rounded-full shrink-0 ${
              selectedCategory === catName ? "bg-orange-500 hover:bg-orange-600 text-white" : ""
            }`}
            onClick={() => setSelectedCategory(catName)}
          >
            {catName} ({count})
          </Button>
        ))}
      </div>

      {/* 2. Controles (Toggles, Ordenação e Filtro) */}
      <div className="flex flex-col gap-4 py-3 px-4 md:px-6 rounded-2xl md:rounded-xl border border-transparent bg-card shadow-sm mb-6">
        <div className="flex items-center justify-between gap-4 w-full flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2">
            <Switch
              id="show-only-pending"
              checked={showOnlyPending}
              onCheckedChange={setShowOnlyPending}
              className="scale-75 origin-left"
            />
            <Label htmlFor="show-only-pending" className="text-sm font-medium cursor-pointer">
              Apenas pendentes
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="group-cc"
              checked={groupCreditCards}
              onCheckedChange={setGroupCreditCards}
              className="scale-75 origin-right"
            />
            <Label htmlFor="group-cc" className="text-sm font-medium cursor-pointer">
              Agrupar faturas
            </Label>
          </div>
        </div>

        <div className="flex items-center justify-between w-full pt-3 border-t border-border/50 gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-by" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Ordenar por:
            </Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sort-by" className="w-[140px] sm:w-[180px] h-9 bg-background rounded-full border-transparent">
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
          
          <Button variant="outline" size="sm" className="gap-2 rounded-full whitespace-nowrap">
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
        </div>
      </div>

      {displayedTransactions.length === 0 ? (
        <div className="text-center p-12 border rounded-lg border-dashed text-muted-foreground bg-muted/20">
          Nenhuma transação encontrada para este período.
        </div>
      ) : (

        <div className="flex flex-col gap-6">
          {groupedTransactions.map((group) => (
            <div key={group.date} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground px-2">
                {format(parseISO(group.date), "dd 'de' MMMM", { locale: ptBR })}
              </h3>
              <div className="flex flex-col gap-2">
                {group.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="group relative flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-card hover:bg-muted/50 border border-border/50 shadow-sm transition-colors gap-3 sm:gap-4"
                  >
                    {/* Esquerda (Ícone e Textos) */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(tx)}
                        disabled={isPending && loadingId === tx.id}
                        className="shrink-0 transition-colors"
                        title={tx.status === "paid" ? "Desfazer pagamento" : "Marcar como pago"}
                      >
                        {isPending && loadingId === tx.id ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-muted-foreground" />
                        ) : tx.status === "paid" ? (
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                        ) : tx.status === "partial" ? (
                          <MinusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                        ) : (
                          <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                      {getIcon(tx.type)}
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm sm:text-base truncate leading-tight">{tx.description}</span>
                        <span className="text-xs text-muted-foreground truncate mt-0.5">
                          {getSource(tx)} • {tx.category?.name || "Geral"}
                        </span>
                      </div>
                    </div>

                    {/* Direita (Valores, Badge e Ações) */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={`font-semibold text-sm sm:text-base ${
                            tx.type === "income" || (tx.type === "transfer" && tx.description.includes("(Entrada)"))
                              ? "text-emerald-500"
                              : "text-rose-500"
                          }`}
                        >
                          {tx.type === "income" || (tx.type === "transfer" && tx.description.includes("(Entrada)"))
                            ? "+"
                            : "-"}
                          {formatCurrency(tx.amount)}
                        </span>

                        <button 
                          onClick={() => handleMarkAsPaid(tx)}
                          disabled={loadingId === tx.id}
                          className="transition-opacity hover:opacity-80"
                        >
                          {tx.status === "paid" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 uppercase font-bold text-[10px] border-0 h-5 px-1.5 cursor-pointer">
                              {tx.type === "income" || (tx.type === "transfer" && tx.description.includes("(Entrada)")) ? "Recebido" : "Pago"}
                            </Badge>
                          ) : tx.status === "partial" ? (
                            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 uppercase font-bold px-1.5 h-5 bg-transparent cursor-pointer">
                              Parcial
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 uppercase font-bold px-1.5 h-5 bg-transparent cursor-pointer">
                              Pendente
                            </Badge>
                          )}
                        </button>
                      </div>

                      {/* Ações (Edit/Delete) */}
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
                            className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
