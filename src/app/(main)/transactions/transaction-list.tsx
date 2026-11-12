"use client";

import { getAccounts } from "@/app/actions/accounts";
import { payFullInvoice, revertInvoicePayment } from "@/app/actions/credit-cards";
import { deleteTransaction, toggleTransactionStatus } from "@/app/actions/transactions";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Loader2, Minus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { EditTransactionDialog } from "@/components/edit-transaction-dialog";
import { TransactionDetailsDialog } from "@/components/transaction-details-dialog";
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
import { Filter, Pencil, Trash } from "lucide-react";

export type TransactionWithRelations = {
  id: number;
  description: string;
  amount: string | number;
  dueDate: string;
  launchDate: string;
  date?: string;
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

interface DynamicFitTextProps {
  text: string;
  maxFontSizePx: number;
  minFontSizePx: number;
  maxWidthPx?: number;
  className?: string;
  allowWrapAtMin?: boolean;
}

function DynamicFitText({
  text,
  maxFontSizePx,
  minFontSizePx,
  maxWidthPx,
  className = "",
  allowWrapAtMin = false,
}: DynamicFitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const adjustFontSize = useCallback(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const availableWidth = maxWidthPx ?? container.clientWidth;
    if (availableWidth <= 0) return;

    textEl.style.whiteSpace = "nowrap";
    textEl.style.fontSize = `${maxFontSizePx}px`;

    const naturalWidth = textEl.scrollWidth;
    if (naturalWidth <= availableWidth) {
      return;
    }

    const ratio = availableWidth / naturalWidth;
    const calculatedSize = Math.max(minFontSizePx, Math.floor(maxFontSizePx * ratio * 10) / 10);
    textEl.style.fontSize = `${calculatedSize}px`;

    if (allowWrapAtMin && calculatedSize <= minFontSizePx && textEl.scrollWidth > availableWidth) {
      textEl.style.whiteSpace = "normal";
    }
  }, [maxFontSizePx, minFontSizePx, maxWidthPx, allowWrapAtMin]);

  useEffect(() => {
    adjustFontSize();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      adjustFontSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [adjustFontSize, text]);

  return (
    <div
      ref={containerRef}
      className={maxWidthPx ? "shrink-0 flex justify-end" : "w-full min-w-0 overflow-hidden tx-fluid-container"}
    >
      <span
        ref={textRef}
        style={{ fontSize: `${maxFontSizePx}px` }}
        className={`block leading-tight whitespace-nowrap break-words ${className}`}
      >
        {text}
      </span>
    </div>
  );
}

interface UnifiedTransactionStatusButtonProps {
  tx: TransactionWithRelations;
  isLoading: boolean;
  onToggle: (tx: TransactionWithRelations) => void;
}

function UnifiedTransactionStatusButton({ tx, isLoading, onToggle }: UnifiedTransactionStatusButtonProps) {
  const isIncome = tx.type === "income" || (tx.type === "transfer" && tx.description.includes("(Entrada)"));
  const isPaid = tx.status === "paid";
  const isPartial = tx.status === "partial";

  const getTypeColorClasses = () => {
    if (isIncome) {
      if (isPaid) {
        return "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30";
      }
      if (isPartial) {
        return "bg-emerald-500/15 border-emerald-500 text-emerald-500";
      }
      return "bg-transparent border-emerald-500 text-emerald-500 group-hover/status:bg-emerald-500/10";
    }
    if (tx.type === "transfer") {
      if (isPaid) {
        return "bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-500/30";
      }
      if (isPartial) {
        return "bg-blue-500/15 border-blue-500 text-blue-500";
      }
      return "bg-transparent border-blue-500 text-blue-500 group-hover/status:bg-blue-500/10";
    }
    if (tx.type === "credit_card_expense") {
      if (isPaid) {
        return "bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-500/30";
      }
      if (isPartial) {
        return "bg-orange-500/15 border-orange-500 text-orange-500";
      }
      return "bg-transparent border-orange-500 text-orange-500 group-hover/status:bg-orange-500/10";
    }
    if (isPaid) {
      return "bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/30";
    }
    if (isPartial) {
      return "bg-rose-500/15 border-rose-500 text-rose-500";
    }
    return "bg-transparent border-rose-500 text-rose-500 group-hover/status:bg-rose-500/10";
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(tx);
      }}
      disabled={isLoading}
      title={
        isPaid
          ? isIncome
            ? "Desfazer recebimento"
            : "Desfazer pagamento"
          : isIncome
            ? "Marcar como recebido"
            : "Marcar como pago"
      }
      className="group/status w-[54px] sm:w-[62px] flex flex-col items-center justify-center gap-1.5 shrink-0 focus:outline-none transition-transform active:scale-95 cursor-pointer"
    >
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all ${getTypeColorClasses()} group-hover/status:brightness-110`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
        ) : isPaid ? (
          <Check className="w-4 h-4 sm:w-[18px] sm:h-[18px] stroke-[3]" />
        ) : isPartial ? (
          <Minus className="w-4 h-4 sm:w-[18px] sm:h-[18px] stroke-[2.75]" />
        ) : null}
      </div>

      {isPaid ? (
        <Badge className="w-full justify-center bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border border-emerald-500/30 uppercase font-bold text-[8px] sm:text-[9px] leading-none h-4 px-1 rounded-full">
          {isIncome ? "Recebido" : "Pago"}
        </Badge>
      ) : isPartial ? (
        <Badge
          variant="outline"
          className="w-full justify-center text-[8px] sm:text-[9px] text-amber-500 border-amber-500/40 bg-amber-500/10 uppercase font-bold leading-none px-1 h-4 rounded-full"
        >
          Parcial
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="w-full justify-center text-[8px] sm:text-[9px] text-amber-500 border-amber-500/40 bg-amber-500/5 uppercase font-bold leading-none px-1 h-4 rounded-full"
        >
          Pendente
        </Badge>
      )}
    </button>
  );
}

export function TransactionList({ transactions }: { transactions: TransactionWithRelations[] }) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [groupCreditCards, setGroupCreditCards] = useState(true);
  const [viewingTransaction, setViewingTransaction] = useState<TransactionWithRelations | null>(null);
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
            dueDate: tx.dueDate || tx.date || "",
            launchDate: tx.launchDate || tx.dueDate || tx.date || "",
            date: tx.dueDate || tx.date || "",
            competencyMonth: tx.competencyMonth ?? "",
            invoiceMonth: tx.invoiceMonth ?? null,
            fixedTransactionId: tx.fixedTransactionId ?? null,
          }
        : undefined;

      const result = await toggleTransactionStatus(tx.id, tx.status, isVirtual, virtualData);
      if (!result.success && result.error) {
        alert(result.error);
      }
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
      isVirtual ? transactionToDelete.dueDate || transactionToDelete.date : undefined,
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

    handleToggleStatus(tx);
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
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
            let groupDate = tx.dueDate || tx.date || "";

            const cardDueDay = tx.creditCard?.dueDay;
            if (cardDueDay) {
              const invoiceMonthToUse = tx.invoiceMonth || tx.competencyMonth || "";
              groupDate = `${invoiceMonthToUse}-${String(cardDueDay).padStart(2, "0")}`;
            }

            grouped.set(groupKey, {
              id: -(
                tx.creditCardId * 10000 +
                parseInt((tx.invoiceMonth || tx.competencyMonth || "0").replace("-", ""))
              ), // id virtual determinístico
              isGroup: true,
              type: "expense",
              description: `Fatura: ${tx.creditCard?.name || "Cartão"}`,
              amount: 0,
              dueDate: groupDate,
              launchDate: groupDate,
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
        return new Date(b.dueDate || b.date || 0).getTime() - new Date(a.dueDate || a.date || 0).getTime();
      }
      if (sortBy === "date_asc") {
        return new Date(a.dueDate || a.date || 0).getTime() - new Date(b.dueDate || b.date || 0).getTime();
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
      const dateKey = (tx.dueDate || tx.date || "").split("T")[0];
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
      {/* 1. Chips de Categoria (Apple Liquid Glass) */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide py-1">
        <button
          type="button"
          className={cn(
            "relative inline-flex items-center justify-center rounded-full shrink-0 h-8 sm:h-9 px-4 text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-xl select-none",
            selectedCategory === "Todas"
              ? "text-white border border-primary/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.40),0_4px_20px_rgba(130,10,209,0.40)]"
              : "text-muted-foreground border border-white/[0.08] hover:border-white/25 hover:text-foreground hover:bg-white/[0.06] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]",
          )}
          style={
            selectedCategory === "Todas"
              ? {
                  background: "linear-gradient(135deg, rgba(130, 10, 209, 0.75) 0%, rgba(90, 5, 150, 0.45) 100%)",
                }
              : {
                  background:
                    "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%), rgba(12, 12, 18, 0.65)",
                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                }
          }
          onClick={() => setSelectedCategory("Todas")}
        >
          {/* Top specular reflection shimmer */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <span>Todas ({categoriesData.total})</span>
        </button>
        {categoriesData.list.map(([catName, count]) => {
          const isSelected = selectedCategory === catName;
          return (
            <button
              key={catName}
              type="button"
              className={cn(
                "relative inline-flex items-center justify-center rounded-full shrink-0 h-8 sm:h-9 px-4 text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-xl select-none",
                isSelected
                  ? "text-white border border-primary/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.40),0_4px_20px_rgba(130,10,209,0.40)]"
                  : "text-muted-foreground border border-white/[0.08] hover:border-white/25 hover:text-foreground hover:bg-white/[0.06] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]",
              )}
              style={
                isSelected
                  ? {
                      background: "linear-gradient(135deg, rgba(130, 10, 209, 0.75) 0%, rgba(90, 5, 150, 0.45) 100%)",
                    }
                  : {
                      background:
                        "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%), rgba(12, 12, 18, 0.65)",
                      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                    }
              }
              onClick={() => setSelectedCategory(catName)}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent" />
              <span>
                {catName} ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Controles (Toggles, Ordenação e Filtro) - Apple Liquid Glass Container */}
      <div className="flex flex-col gap-3 p-3.5 sm:p-4 rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)] mb-6 relative overflow-hidden">
        {/* Top edge shimmer */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between sm:gap-4 w-full">
          <Label
            htmlFor="show-only-pending"
            className={cn(
              "relative flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-2xl text-[11px] sm:text-sm font-medium cursor-pointer select-none transition-all duration-300 min-w-0 overflow-hidden backdrop-blur-xl border",
              showOnlyPending
                ? "border-primary/50 text-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_0_16px_rgba(130,10,209,0.2)] bg-gradient-to-r from-primary/20 to-primary/5"
                : "border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/20 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
            )}
          >
            <Switch
              id="show-only-pending"
              checked={showOnlyPending}
              onCheckedChange={setShowOnlyPending}
              className="scale-75 origin-left shrink-0 -mr-2.5"
            />
            <span className="whitespace-nowrap leading-tight">Apenas pendentes</span>
          </Label>

          <Label
            htmlFor="group-cc"
            className={cn(
              "relative flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-2xl text-[11px] sm:text-sm font-medium cursor-pointer select-none transition-all duration-300 min-w-0 overflow-hidden backdrop-blur-xl border",
              groupCreditCards
                ? "border-primary/50 text-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_0_16px_rgba(130,10,209,0.2)] bg-gradient-to-r from-primary/20 to-primary/5"
                : "border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/20 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
            )}
          >
            <Switch
              id="group-cc"
              checked={groupCreditCards}
              onCheckedChange={setGroupCreditCards}
              className="scale-75 origin-left shrink-0 -mr-2.5"
            />
            <span className="whitespace-nowrap leading-tight">Agrupar faturas</span>
          </Label>
        </div>

        <div className="flex items-center justify-between w-full pt-2.5 border-t border-white/[0.08] gap-2 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Label
              htmlFor="sort-by"
              className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap shrink-0"
            >
              Ordenar<span className="hidden sm:inline"> por</span>:
            </Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger
                id="sort-by"
                className="flex-1 sm:w-[190px] sm:flex-none h-9 bg-white/[0.04] backdrop-blur-md rounded-xl border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-xs sm:text-sm px-3 whitespace-nowrap hover:bg-white/[0.08] hover:border-white/20 transition-all *:data-[slot=select-value]:truncate"
              >
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

          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 gap-1.5 rounded-xl whitespace-nowrap text-xs sm:text-sm shrink-0 bg-white/[0.04] backdrop-blur-md border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.08] hover:border-white/20 transition-all"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
          </Button>
        </div>
      </div>

      {displayedTransactions.length === 0 ? (
        <div className="text-center p-12 border rounded-2xl border-dashed border-white/10 text-muted-foreground bg-card/60 backdrop-blur-md">
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
                {group.transactions.map((tx) => {
                  const isIncome =
                    tx.type === "income" || (tx.type === "transfer" && tx.description.includes("(Entrada)"));
                  const formattedAmount = `${isIncome ? "+" : "-"}${formatCurrency(tx.amount)}`;
                  const subtitleParts = [
                    getSource(tx),
                    tx.category?.name || "Geral",
                    tx.launchDate && !tx.isGroup
                      ? `Lançado em ${format(parseISO(tx.launchDate.split("T")[0]), "dd/MM/yyyy")}`
                      : null,
                  ].filter((part): part is string => Boolean(part));

                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        if (!tx.isGroup) {
                          setViewingTransaction(tx);
                        }
                      }}
                      className={cn(
                        "group relative flex items-center justify-between p-2.5 sm:p-4 rounded-2xl bg-card/85 backdrop-blur-md border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_16px_rgba(0,0,0,0.35)] transition-all duration-200 hover:bg-card/95 hover:border-white/15 gap-2.5 sm:gap-4 overflow-hidden",
                        !tx.isGroup && "cursor-pointer",
                      )}
                    >
                      {/* Esquerda (Componente Unificado de Status/Tipo com Tag + Descrição expandida) */}
                      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                        <UnifiedTransactionStatusButton
                          tx={tx}
                          isLoading={isPending && loadingId === tx.id}
                          onToggle={handleMarkAsPaid}
                        />
                        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                          <DynamicFitText
                            text={tx.description}
                            maxFontSizePx={15}
                            minFontSizePx={8.5}
                            allowWrapAtMin={true}
                            className="font-semibold text-foreground tx-fluid-description"
                          />
                          <DynamicFitText
                            text={subtitleParts.join(" • ")}
                            maxFontSizePx={11.5}
                            minFontSizePx={8}
                            allowWrapAtMin={true}
                            className="text-muted-foreground"
                          />
                        </div>
                      </div>

                      {/* Direita (Valor dinâmico e Ações) */}
                      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                        <DynamicFitText
                          text={formattedAmount}
                          maxFontSizePx={15}
                          minFontSizePx={10.5}
                          maxWidthPx={96}
                          className={`font-semibold text-right tracking-tight ${
                            isIncome ? "text-emerald-500" : "text-rose-500"
                          }`}
                        />

                        {/* Ações (Edit/Delete) */}
                        {!tx.isGroup && (
                          <div className="flex items-center gap-0.5 sm:gap-1" onClick={(e) => e.stopPropagation()}>
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
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <TransactionDetailsDialog
        transaction={viewingTransaction}
        open={!!viewingTransaction}
        onOpenChange={(open) => !open && setViewingTransaction(null)}
        onEdit={() => {
          if (viewingTransaction) setTransactionToEdit(viewingTransaction);
        }}
        onDelete={() => {
          if (viewingTransaction) setTransactionToDelete(viewingTransaction);
        }}
      />

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
