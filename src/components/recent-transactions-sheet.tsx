"use client";

import {
  deleteTransaction,
  getRecentRegisteredTransactions,
  toggleTransactionStatus,
} from "@/app/actions/transactions";
import { CategoryIcon } from "@/components/category-icon";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  Check,
  Clock,
  CreditCard,
  History,
  Landmark,
  Layers,
  Loader2,
  Pencil,
  RefreshCw,
  Repeat,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type RecentTransactionItem = Awaited<ReturnType<typeof getRecentRegisteredTransactions>>[number];

type FilterType = "all" | "expense" | "credit_card_expense" | "income" | "transfer";

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "expense", label: "Conta (Despesa)" },
  { value: "credit_card_expense", label: "Cartão" },
  { value: "income", label: "Receita" },
  { value: "transfer", label: "Transferência" },
];

const formatCurrency = (val: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(val));

const formatDateBr = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  try {
    return format(parseISO(dateStr.slice(0, 10)), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

const formatMonthBr = (monthStr?: string | null) => {
  if (!monthStr) return "-";
  try {
    const formatted = format(parseISO(`${monthStr}-01`), "MMM/yyyy", { locale: ptBR });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return monthStr;
  }
};

export interface RecentTransactionsSheetProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  currentSelectedMonth?: string;
}

export function RecentTransactionsSheet({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  currentSelectedMonth,
}: RecentTransactionsSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      controlledOnOpenChange?.(next);
    },
    [isControlled, controlledOnOpenChange],
  );

  const [items, setItems] = useState<RecentTransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");

  const [selectedForDetails, setSelectedForDetails] = useState<RecentTransactionItem | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<RecentTransactionItem | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<RecentTransactionItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const router = useRouter();

  const loadRecent = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecentRegisteredTransactions(50);
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch recent transactions:", error);
      toast.error("Não foi possível carregar os últimos cadastros.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadRecent();
    }
  }, [open, loadRecent]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchCat = item.category?.name.toLowerCase().includes(q);
        const matchSub = item.subcategory?.name.toLowerCase().includes(q);
        const matchAcc =
          item.account?.name.toLowerCase().includes(q) ||
          item.originAccount?.name.toLowerCase().includes(q) ||
          item.destinationAccount?.name.toLowerCase().includes(q);
        const matchCard = item.creditCard?.name.toLowerCase().includes(q);
        const matchAmount = String(item.amount).includes(q) || formatCurrency(item.amount).toLowerCase().includes(q);
        const matchMonth =
          item.competencyMonth?.toLowerCase().includes(q) ||
          formatMonthBr(item.invoiceMonth || item.competencyMonth)
            .toLowerCase()
            .includes(q);
        return matchDesc || matchCat || matchSub || matchAcc || matchCard || matchAmount || matchMonth;
      }
      return true;
    });
  }, [items, typeFilter, search]);

  const handleToggleStatus = async (item: RecentTransactionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === "credit_card_expense") return;
    setTogglingId(item.id);
    try {
      const res = await toggleTransactionStatus(item.id, item.status);
      if (res.success) {
        toast.success(res.newStatus === "paid" ? "Marcada como paga/recebida!" : "Marcada como pendente!");
        await loadRecent();
        router.refresh();
      } else {
        toast.error(res.error || "Erro ao alterar status.");
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (mode: "single" | "future" | "all") => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteTransaction(
        transactionToDelete.id,
        mode,
        false,
        transactionToDelete.fixedTransactionId || undefined,
        transactionToDelete.dueDate,
        transactionToDelete.invoiceMonth || transactionToDelete.competencyMonth,
      );
      if (res.success) {
        toast.success("Transação excluída com sucesso!");
        setTransactionToDelete(null);
        await loadRecent();
        router.refresh();
      } else {
        toast.error(res.error || "Erro ao excluir transação.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const referenceMonth = currentSelectedMonth || format(new Date(), "yyyy-MM");

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}

        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col bg-black/95 backdrop-blur-2xl border-l border-white/[0.10] shadow-2xl"
        >
          {/* Header */}
          <SheetHeader className="px-4 sm:px-6 pt-5 pb-4 border-b border-white/[0.08] bg-white/[0.02] shrink-0 space-y-3">
            <div className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                  <History className="size-5" />
                </div>
                <div>
                  <SheetTitle className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                    Últimos Cadastros
                    <Badge
                      variant="outline"
                      className="text-[11px] font-semibold border-primary/40 bg-primary/10 text-primary"
                    >
                      {items.length} recentes
                    </Badge>
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Ordem real de criação no banco — encontre qualquer lançamento independente da data ou mês salvo.
                  </SheetDescription>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={loadRecent}
                disabled={loading}
                title="Atualizar lista"
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] cursor-pointer"
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              </Button>
            </div>

            {/* Search and Type Filter Pills */}
            <div className="space-y-2.5 pt-1">
              <div className="relative">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por descrição, valor, categoria, conta, cartão ou mês..."
                  className="pl-9 h-9 bg-white/[0.04] border-white/[0.10] rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {FILTER_OPTIONS.map((opt) => {
                  const active = typeFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTypeFilter(opt.value)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border",
                        active
                          ? "bg-primary/20 text-primary border-primary/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                          : "bg-white/[0.03] text-muted-foreground border-white/[0.06] hover:bg-white/[0.07] hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </SheetHeader>

          {/* List Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2.5 scrollbar-thin">
            {loading && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Loader2 className="size-7 animate-spin text-primary" />
                <span className="text-xs">Buscando últimos cadastros...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2 border border-dashed border-white/10 rounded-2xl p-6">
                <History className="size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">Nenhuma transação encontrada</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Tente limpar o filtro de busca ou cadastre uma nova transação.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isIncome = item.type === "income";
                const isTransfer = item.type === "transfer";
                const isCreditCard = item.type === "credit_card_expense";
                const targetCompetency = item.invoiceMonth || item.competencyMonth || "";
                const isDifferentMonth = Boolean(targetCompetency && targetCompetency !== referenceMonth);

                const typeLabel = isIncome
                  ? "Receita"
                  : isTransfer
                    ? "Transferência"
                    : isCreditCard
                      ? "Cartão de Crédito"
                      : "Despesa";

                const typeColorClass = isIncome
                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                  : isTransfer
                    ? "text-sky-400 border-sky-500/30 bg-sky-500/10"
                    : isCreditCard
                      ? "text-purple-400 border-purple-500/30 bg-purple-500/10"
                      : "text-rose-400 border-rose-500/30 bg-rose-500/10";

                const amountColorClass = isIncome
                  ? "text-emerald-400"
                  : isTransfer
                    ? "text-sky-400"
                    : "text-rose-400";

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedForDetails(item)}
                    className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.16] p-3.5 transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left Icon & Main Info */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={cn(
                            "size-10 rounded-xl flex items-center justify-center shrink-0 border",
                            typeColorClass,
                          )}
                        >
                          {isTransfer ? (
                            <ArrowRightLeft className="size-4" />
                          ) : (
                            <CategoryIcon name={item.category?.icon || "Tag"} className="size-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground truncate max-w-[240px] sm:max-w-[300px]">
                              {item.description}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground/70 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                              #{item.id}
                            </span>
                          </div>

                          {/* Badges Row: Type, Modality, Category */}
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                            <span className={cn("px-2 py-0.5 rounded-md font-medium border", typeColorClass)}>
                              {typeLabel}
                            </span>

                            {item.fixedTransactionId && (
                              <span className="px-2 py-0.5 rounded-md font-medium border border-amber-500/30 bg-amber-500/10 text-amber-300 flex items-center gap-1">
                                <Repeat className="size-3" />
                                Fixa
                              </span>
                            )}

                            {item.installmentTotal && item.installmentTotal > 1 && (
                              <span className="px-2 py-0.5 rounded-md font-medium border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 flex items-center gap-1">
                                <Layers className="size-3" />
                                Parcelada ({item.installmentCurrent || 1}/{item.installmentTotal})
                              </span>
                            )}

                            {!isTransfer && item.category && (
                              <span className="text-muted-foreground truncate">
                                {item.category.name}
                                {item.subcategory ? ` • ${item.subcategory.name}` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Quick Actions */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={cn("font-bold text-sm sm:text-base tabular-nums", amountColorClass)}>
                          {isIncome ? "+" : isTransfer ? "" : "-"} {formatCurrency(item.amount)}
                        </span>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {!isCreditCard && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={togglingId === item.id}
                              onClick={(e) => handleToggleStatus(item, e)}
                              title={item.status === "paid" ? "Pago/Recebido (clique para pendente)" : "Pendente (clique para dar baixa)"}
                              className={cn(
                                "size-7 rounded-lg border cursor-pointer",
                                item.status === "paid"
                                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                                  : "border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {togglingId === item.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : item.status === "paid" ? (
                                <Check className="size-3.5" />
                              ) : (
                                <Clock className="size-3.5" />
                              )}
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setTransactionToEdit(item)}
                            title="Editar transação"
                            className="size-7 rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer"
                          >
                            <Pencil className="size-3.5" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setTransactionToDelete(item)}
                            title="Excluir transação"
                            className="size-7 rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Metadata Bar: Where did this transaction land? */}
                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap text-xs">
                      {/* Account or Credit Card */}
                      <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                        {isCreditCard ? (
                          <>
                            <CreditCard className="size-3.5 text-purple-400 shrink-0" />
                            <span className="truncate font-medium text-foreground/90">
                              {item.creditCard?.name || "Cartão"}
                            </span>
                          </>
                        ) : isTransfer && item.isTransferGroup ? (
                          <>
                            <Landmark className="size-3.5 text-sky-400 shrink-0" />
                            <span className="truncate font-medium text-foreground/90">
                              {item.originAccount?.name || "Origem"}
                            </span>
                            <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                            <span className="truncate font-medium text-foreground/90">
                              {item.destinationAccount?.name || "Destino"}
                            </span>
                          </>
                        ) : (
                          <>
                            <Landmark className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate font-medium text-foreground/90">
                              {item.account?.name || "Sem conta"}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Dates & Competency Destination */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[11px] text-muted-foreground flex items-center gap-1"
                          title={`Lançamento: ${formatDateBr(item.launchDate)} | Vencimento: ${formatDateBr(item.dueDate)}`}
                        >
                          <Calendar className="size-3" />
                          {item.launchDate !== item.dueDate ? (
                            <span>
                              Lanç: {formatDateBr(item.launchDate)} • Venc: {formatDateBr(item.dueDate)}
                            </span>
                          ) : (
                            <span>{formatDateBr(item.dueDate)}</span>
                          )}
                        </span>

                        {/* Competency / Invoice Pill */}
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 border",
                            isDifferentMonth
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                              : "border-white/10 bg-white/[0.05] text-foreground/80",
                          )}
                          title={
                            isDifferentMonth
                              ? `Caiu em ${formatMonthBr(targetCompetency)} (diferente do mês atual ${formatMonthBr(referenceMonth)})`
                              : `Competência / Fatura: ${formatMonthBr(targetCompetency)}`
                          }
                        >
                          {isDifferentMonth && <AlertTriangle className="size-3 text-amber-400 shrink-0" />}
                          {isCreditCard ? "Fatura " : "Comp. "}
                          {formatMonthBr(targetCompetency)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Transaction Full Details Modal */}
      <TransactionDetailsDialog
        transaction={selectedForDetails}
        open={!!selectedForDetails}
        onOpenChange={(isOpen) => !isOpen && setSelectedForDetails(null)}
        onEdit={() => {
          if (selectedForDetails) {
            const target = selectedForDetails;
            setSelectedForDetails(null);
            setTransactionToEdit(target);
          }
        }}
        onDelete={() => {
          if (selectedForDetails) {
            const target = selectedForDetails;
            setSelectedForDetails(null);
            setTransactionToDelete(target);
          }
        }}
      />

      {/* Edit Modal */}
      <EditTransactionDialog
        transaction={transactionToEdit}
        open={!!transactionToEdit}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setTransactionToEdit(null);
            loadRecent();
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!transactionToDelete} onOpenChange={(isOpen) => !isOpen && setTransactionToDelete(null)}>
        <AlertDialogContent className="sm:max-w-[540px]">
          {transactionToDelete && transactionToDelete.fixedTransactionId ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir transação fixa?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta é uma transação fixa recorrente. Escolha como deseja excluir: apenas este mês, desta competência
                  em diante ou todas as pendentes da recorrência.
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
                  className="border border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground cursor-pointer"
                >
                  Desta competência em diante
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete("all");
                  }}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
                >
                  {isDeleting ? "Excluindo..." : "Todas (pendentes)"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : transactionToDelete &&
            transactionToDelete.installmentTotal &&
            transactionToDelete.installmentTotal > 1 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir transação parcelada?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta transação faz parte de um parcelamento. Deseja excluir apenas esta parcela ou esta e todas as
                  próximas?
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
    </>
  );
}
