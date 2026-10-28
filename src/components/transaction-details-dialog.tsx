"use client";

import {
  getTransactionFullDetails,
  type TransactionFullDetails,
  type TransactionInstallmentItem,
} from "@/app/actions/transactions";
import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpCircle,
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit,
  FileText,
  Hash,
  Landmark,
  Layers,
  Loader2,
  PiggyBank,
  Repeat,
  Sparkles,
  Tag,
  Trash,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export interface TransactionSummaryProp {
  id: number | string;
  description: string;
  amount: string | number;
  type: string;
  status?: string;
  dueDate?: string;
  launchDate?: string;
  date?: string;
  competencyMonth?: string;
  invoiceMonth?: string | null;
  isFixed?: boolean | null;
  fixedTransactionId?: string | null;
  installmentCurrent?: number | null;
  installmentTotal?: number | null;
  parentTransactionId?: number | null;
  installmentParentId?: number | null;
  observations?: string | null;
  accountId?: number | null;
  creditCardId?: number | null;
  categoryId?: number | null;
  subcategoryId?: number | null;
  account?: { id?: number; name: string; type?: string } | null;
  creditCard?: { id?: number; name: string; closingDay?: number; dueDay?: number } | null;
  category?: { id?: number; name: string; icon?: string | null } | null;
  subcategory?: { id?: number; name: string } | null;
}

interface TransactionDetailsDialogProps {
  transaction: TransactionSummaryProp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "Conta Corrente",
  savings: "Poupança",
  wallet: "Carteira",
  stash: "Caixinha / Meta",
  food: "Vale Alimentação",
  meal: "Vale Refeição",
};

const formatCurrency = (value: number | string) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
};

const formatFullDate = (dateStr?: string | Date | null) => {
  if (!dateStr) return "-";
  try {
    if (dateStr instanceof Date) {
      return format(dateStr, "dd/MM/yyyy", { locale: ptBR });
    }
    const cleanDate = dateStr.split("T")[0];
    return format(parseISO(cleanDate), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return String(dateStr);
  }
};

const formatDateWithWeekday = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  try {
    const cleanDate = dateStr.split("T")[0];
    const parsed = parseISO(cleanDate);
    const formatted = format(parsed, "dd/MM/yyyy (EEEE)", { locale: ptBR });
    return formatted;
  } catch {
    return dateStr;
  }
};

const formatCompetencyMonth = (monthStr?: string | null) => {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return monthStr || "-";
  try {
    const [year, month] = monthStr.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    const label = format(d, "MMMM 'de' yyyy", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return monthStr;
  }
};

const formatShortCompetency = (monthStr?: string | null) => {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return monthStr || "-";
  try {
    const [year, month] = monthStr.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    const label = format(d, "MMM/yyyy", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return monthStr;
  }
};

export function TransactionDetailsDialog({
  transaction,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: TransactionDetailsDialogProps) {
  const [details, setDetails] = useState<TransactionFullDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const currentRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    let active = true;

    if (open && transaction) {
      const numericId = Number(transaction.id);
      if (!isNaN(numericId) && numericId > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        getTransactionFullDetails(numericId)
          .then((res) => {
            if (active) {
              setDetails(res);
              setLoading(false);
            }
          })
          .catch(() => {
            if (active) {
              setLoading(false);
            }
          });
      } else {
        setDetails(null);
        setLoading(false);
      }
    } else if (!open) {
      setDetails(null);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [open, transaction]);

  useEffect(() => {
    if (details?.installments && details.installments.length > 0 && currentRowRef.current) {
      const timer = setTimeout(() => {
        currentRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [details]);

  const merged = useMemo(() => {
    if (!transaction) return null;

    const desc = details?.description ?? transaction.description;
    const descMatch = desc.match(/\((\d+)\/(\d+)\)/);

    const installmentCurrent =
      details?.installmentCurrent ??
      transaction.installmentCurrent ??
      (descMatch ? parseInt(descMatch[1], 10) : null);

    const installmentTotal =
      details?.installmentTotal ??
      transaction.installmentTotal ??
      (descMatch ? parseInt(descMatch[2], 10) : null);

    const dueDate = details?.dueDate ?? transaction.dueDate ?? transaction.date ?? "";
    const launchDate = details?.launchDate ?? transaction.launchDate ?? dueDate;
    const competencyMonth = details?.competencyMonth ?? transaction.competencyMonth ?? dueDate.substring(0, 7);
    const invoiceMonth = details?.invoiceMonth ?? transaction.invoiceMonth ?? null;
    const type = details?.type ?? transaction.type;
    const status = details?.status ?? transaction.status ?? "pending";
    const amount = details?.amount ?? transaction.amount;
    const isFixed =
      details?.isFixed ??
      Boolean(transaction.isFixed || transaction.fixedTransactionId);

    const category = details?.category ?? transaction.category ?? null;
    const subcategory = details?.subcategory ?? transaction.subcategory ?? null;
    const account = details?.account ?? transaction.account ?? null;
    const creditCard = details?.creditCard ?? transaction.creditCard ?? null;
    const observations = details?.observations ?? transaction.observations ?? null;
    const paidAt = details?.paidAt ?? null;

    let installments: TransactionInstallmentItem[] = details?.installments ?? [];

    // Fallback synthesis if still loading or virtual parcelada transaction
    if (installments.length === 0 && installmentTotal && installmentTotal > 1) {
      const currentNum = installmentCurrent ?? 1;
      const cleanTitle = desc.replace(/\s*\(\d+\/\d+\)/g, "").trim();
      const refDue = dueDate ? parseISO(dueDate.split("T")[0]) : new Date();
      const refLaunch = launchDate ? parseISO(launchDate.split("T")[0]) : refDue;
      const refComp = competencyMonth && /^\d{4}-\d{2}$/.test(competencyMonth)
        ? parseISO(`${competencyMonth}-01`)
        : refDue;

      installments = Array.from({ length: installmentTotal }, (_, idx) => {
        const num = idx + 1;
        const diff = num - currentNum;
        const synthDue = format(addMonths(refDue, diff), "yyyy-MM-dd");
        const synthLaunch = format(addMonths(refLaunch, diff), "yyyy-MM-dd");
        const synthComp = format(addMonths(refComp, diff), "yyyy-MM");
        const isCurrent = num === currentNum;
        const isPast = num < currentNum;

        return {
          id: isCurrent ? Number(transaction.id) : -num,
          installmentCurrent: num,
          installmentTotal,
          description: `${cleanTitle} (${num}/${installmentTotal})`,
          amount: String(amount),
          dueDate: synthDue,
          launchDate: synthLaunch,
          competencyMonth: synthComp,
          invoiceMonth: type === "credit_card_expense" ? synthComp : null,
          status: isCurrent ? status : isPast ? "paid" : "pending",
          paidAt: null,
          isVirtual: !isCurrent,
        };
      });
    }

    return {
      id: transaction.id,
      description: desc,
      amount,
      type,
      status,
      dueDate,
      launchDate,
      competencyMonth,
      invoiceMonth,
      isFixed,
      installmentCurrent,
      installmentTotal,
      category,
      subcategory,
      account,
      originAccount: details?.originAccount ?? null,
      destinationAccount: details?.destinationAccount ?? null,
      creditCard,
      observations,
      paidAt,
      fixedTransaction: details?.fixedTransaction ?? null,
      loan: details?.loan ?? null,
      parentTransactionId: details?.parentTransactionId ?? transaction.parentTransactionId ?? null,
      installments,
    };
  }, [transaction, details]);

  if (!merged) return null;

  const isVirtualTx = typeof merged.id === "number" && merged.id < 0;
  const isIncome =
    merged.type === "income" ||
    (merged.type === "transfer" && (Boolean(merged.parentTransactionId) || merged.description.includes("(Entrada)")));
  const isParcelada = Boolean(merged.installmentTotal && merged.installmentTotal > 1);
  const currentParcelNum = merged.installmentCurrent ?? 1;

  const installmentMetrics = (() => {
    if (!isParcelada || merged.installments.length === 0) return null;

    let totalAmount = 0;
    let paidAmount = 0;
    let paidCount = 0;
    let futureAmount = 0;
    let futureCount = 0;

    for (const inst of merged.installments) {
      const val = Math.abs(Number(inst.amount));
      totalAmount += val;
      const isConsideredPaid = inst.status === "paid" || inst.installmentCurrent < currentParcelNum;
      if (isConsideredPaid) {
        paidAmount += val;
        paidCount++;
      } else {
        futureAmount += val;
        futureCount++;
      }
    }

    const progressPercent =
      merged.installments.length > 0 ? Math.round((paidCount / merged.installments.length) * 100) : 0;

    return {
      totalAmount,
      paidAmount,
      paidCount,
      futureAmount,
      futureCount,
      totalCount: merged.installments.length,
      progressPercent,
    };
  })();

  const getTypeBadge = () => {
    switch (merged.type) {
      case "income":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 gap-1">
            <ArrowUpCircle className="w-3.5 h-3.5" />
            Receita
          </Badge>
        );
      case "credit_card_expense":
        return (
          <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/20 gap-1">
            <CreditCard className="w-3.5 h-3.5" />
            Cartão de Crédito
          </Badge>
        );
      case "transfer":
        return (
          <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 gap-1">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Transferência
          </Badge>
        );
      default:
        return (
          <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/20 gap-1">
            <ArrowDownCircle className="w-3.5 h-3.5" />
            Despesa
          </Badge>
        );
    }
  };

  const getStatusBadge = () => {
    if (isVirtualTx) {
      return (
        <Badge variant="outline" className="bg-purple-500/15 text-purple-400 border-purple-500/30 gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          Projeção Recorrente
        </Badge>
      );
    }
    if (merged.status === "paid") {
      return (
        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isIncome ? "Recebido" : "Pago"}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1">
        <Clock className="w-3.5 h-3.5" />
        Pendente
      </Badge>
    );
  };

  const getFrequencyBadge = () => {
    if (isParcelada) {
      return (
        <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 gap-1">
          <Layers className="w-3.5 h-3.5" />
          Parcela {currentParcelNum} de {merged.installmentTotal}
        </Badge>
      );
    }
    if (merged.isFixed) {
      return (
        <Badge variant="outline" className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30 gap-1">
          <Repeat className="w-3.5 h-3.5" />
          Fixa Mensal
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1">
        Única
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[95vw] max-h-[90dvh] overflow-y-auto p-4 sm:p-6 bg-background border-border",
          isParcelada ? "sm:max-w-3xl" : "sm:max-w-xl",
        )}
      >
        <DialogHeader className="space-y-3 text-left pr-6">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm",
                merged.type === "income"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : merged.type === "credit_card_expense"
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    : merged.type === "transfer"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20",
              )}
            >
              {merged.category?.icon ? (
                <CategoryIcon name={merged.category.icon} className="w-6 h-6" />
              ) : merged.type === "income" ? (
                <ArrowUpCircle className="w-6 h-6" />
              ) : merged.type === "credit_card_expense" ? (
                <CreditCard className="w-6 h-6" />
              ) : merged.type === "transfer" ? (
                <ArrowRightLeft className="w-6 h-6" />
              ) : (
                <ArrowDownCircle className="w-6 h-6" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {getTypeBadge()}
                {getStatusBadge()}
                {getFrequencyBadge()}
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold leading-snug break-words">
                {merged.description}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Detalhes completos da transação {merged.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Destaque de Valor Principal */}
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {isParcelada
                ? `Valor da Parcela (${currentParcelNum}/${merged.installmentTotal})`
                : "Valor da Transação"}
            </span>
            <div
              className={cn(
                "text-2xl sm:text-3xl font-black tracking-tight tabular-nums",
                Number(merged.amount) < 0 || isIncome ? "text-emerald-500" : "text-rose-500",
              )}
            >
              {isIncome || Number(merged.amount) < 0 ? "+" : "-"}
              {formatCurrency(Math.abs(Number(merged.amount)))}
            </div>
          </div>

          {installmentMetrics && (
            <div className="flex items-center gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 text-xs">
              <div>
                <span className="text-muted-foreground block">Valor Total da Compra</span>
                <span className="font-bold text-sm sm:text-base text-foreground tabular-nums">
                  {formatCurrency(installmentMetrics.totalAmount)}
                </span>
              </div>
              <div className="h-7 w-px bg-border/60" />
              <div>
                <span className="text-muted-foreground block">Restante</span>
                <span className="font-bold text-sm sm:text-base text-rose-400 tabular-nums">
                  {formatCurrency(installmentMetrics.futureAmount)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Grade de Informações Detalhadas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {/* Lançamento */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block">Data de Lançamento (Compra)</span>
              <span className="font-semibold text-foreground">{formatDateWithWeekday(merged.launchDate)}</span>
            </div>
          </div>

          {/* Vencimento */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block">
                Data de Vencimento {merged.type === "credit_card_expense" ? "(Fatura)" : "(Pagamento)"}
              </span>
              <span className="font-semibold text-foreground">{formatDateWithWeekday(merged.dueDate)}</span>
            </div>
          </div>

          {/* Competência / Fatura */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block">
                {merged.type === "credit_card_expense" ? "Mês da Fatura" : "Mês de Competência"}
              </span>
              <span className="font-semibold text-foreground">
                {formatCompetencyMonth(merged.invoiceMonth || merged.competencyMonth)}
              </span>
            </div>
          </div>

          {/* Categoria e Subcategoria */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
              {merged.category?.icon ? (
                <CategoryIcon name={merged.category.icon} className="w-4 h-4" />
              ) : (
                <Tag className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block">Categoria e Subcategoria</span>
              <div className="flex items-center gap-1.5 flex-wrap font-semibold text-foreground">
                <span>{merged.category?.name || "Sem categoria"}</span>
                {merged.subcategory?.name && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground font-medium">{merged.subcategory.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Conta / Cartão / Transferência */}
          {merged.type === "transfer" ? (
            <div className="sm:col-span-2 rounded-xl border border-border/50 bg-card/50 p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs text-muted-foreground block">Contas da Transferência</span>
                <div className="flex items-center gap-2 flex-wrap font-semibold text-foreground mt-0.5">
                  <span>{merged.originAccount?.name || merged.account?.name || "Conta Origem"}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{merged.destinationAccount?.name || "Conta Destino"}</span>
                </div>
              </div>
            </div>
          ) : merged.type === "credit_card_expense" || merged.creditCard ? (
            <div className="rounded-xl border border-border/50 bg-card/50 p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground block">Cartão de Crédito</span>
                <span className="font-semibold text-foreground block truncate">
                  {merged.creditCard?.name || "Cartão de Crédito"}
                </span>
                {merged.creditCard?.closingDay && merged.creditCard?.dueDay && (
                  <span className="text-[11px] text-muted-foreground">
                    Fecha dia {merged.creditCard.closingDay} • Vence dia {merged.creditCard.dueDay}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card/50 p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                <Landmark className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground block">Conta Bancária / Caixa</span>
                <span className="font-semibold text-foreground block truncate">
                  {merged.account?.name || "Não informada"}
                </span>
                {merged.account?.type && (
                  <span className="text-[11px] text-muted-foreground">
                    {ACCOUNT_TYPE_LABELS[merged.account.type] || merged.account.type}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Data de Pagamento / ID / Empréstimo */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
              {merged.loan ? <PiggyBank className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              {merged.loan ? (
                <>
                  <span className="text-xs text-muted-foreground block">Empréstimo Vinculado</span>
                  <span className="font-semibold text-foreground block truncate">{merged.loan.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {merged.loan.type === "bank" ? "Financeira" : "Pessoal"} ({merged.loan.installments}x)
                  </span>
                </>
              ) : merged.paidAt ? (
                <>
                  <span className="text-xs text-muted-foreground block">Data de Efetivação</span>
                  <span className="font-semibold text-emerald-400">
                    {format(new Date(merged.paidAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground block">Identificador do Lançamento</span>
                  <span className="font-semibold text-foreground">
                    {isVirtualTx ? "Projeção Automática" : `#${merged.id}`}
                  </span>
                  {merged.fixedTransaction && (
                    <span className="text-[11px] text-muted-foreground block">
                      Recorrência desde {formatFullDate(merged.fixedTransaction.startDate)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Observações (se houver) */}
          {merged.observations && (
            <div className="sm:col-span-2 rounded-xl border border-border/50 bg-card/50 p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs text-muted-foreground block">Observações</span>
                <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap break-words mt-0.5">
                  {merged.observations}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Seção de Parcelas (se a transação for parcelada) */}
        {isParcelada && merged.installments.length > 0 && installmentMetrics && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  Cronograma de Parcelas ({merged.installments.length}x)
                </h3>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Pagas / Anteriores: {installmentMetrics.paidCount} ({formatCurrency(installmentMetrics.paidAmount)})
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Futuras: {installmentMetrics.futureCount} ({formatCurrency(installmentMetrics.futureAmount)})
                </span>
              </div>
            </div>

            {/* Barra de Progresso do Parcelamento */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso do parcelamento</span>
                <span className="font-semibold text-foreground">{installmentMetrics.progressPercent}% concluído</span>
              </div>
              <Progress value={installmentMetrics.progressPercent} className="h-2" />
            </div>

            {/* Tabela de Parcelas */}
            <div
              tabIndex={0}
              role="region"
              aria-labelledby="installments-table-caption"
              className="max-h-[300px] overflow-auto rounded-xl border border-border/70 bg-card/30"
            >
              <Table>
                <caption id="installments-table-caption" className="sr-only">
                  Lista de parcelas anteriores pagas, parcela atual em destaque e parcelas futuras
                </caption>
                <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                  <TableRow>
                    <TableHead scope="col" className="w-[130px]">
                      Parcela
                    </TableHead>
                    <TableHead scope="col">Competência</TableHead>
                    <TableHead scope="col">Vencimento</TableHead>
                    <TableHead scope="col">Data de Pagamento</TableHead>
                    <TableHead scope="col">Valor</TableHead>
                    <TableHead scope="col" className="text-right">
                      Situação
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merged.installments.map((inst) => {
                    const isCurrent =
                      (inst.id > 0 && inst.id === Number(merged.id)) ||
                      inst.installmentCurrent === currentParcelNum;
                    const isPrevious = inst.installmentCurrent < currentParcelNum;
                    const isFuture = inst.installmentCurrent > currentParcelNum;
                    const isPaid = inst.status === "paid" || isPrevious;
                    const paymentDateLabel = isPaid
                      ? formatFullDate(inst.paidAt ?? inst.dueDate)
                      : "-";

                    return (
                      <TableRow
                        key={`${inst.installmentCurrent}-${inst.id}`}
                        ref={isCurrent ? currentRowRef : undefined}
                        className={cn(
                          "transition-colors",
                          isCurrent
                            ? "bg-primary/15 hover:bg-primary/20 border-l-4 border-l-primary font-semibold"
                            : isPaid
                              ? "opacity-80 hover:opacity-100 bg-emerald-500/[0.03]"
                              : "hover:bg-muted/40",
                        )}
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={cn("tabular-nums", isCurrent && "text-primary font-bold")}>
                              {inst.installmentCurrent}/{inst.installmentTotal}
                            </span>
                            {isCurrent && (
                              <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-4 font-bold">
                                Atual
                              </Badge>
                            )}
                            {!isCurrent && isPrevious && (
                              <span className="text-[10px] text-muted-foreground font-normal">Anterior</span>
                            )}
                            {!isCurrent && isFuture && (
                              <span className="text-[10px] text-muted-foreground font-normal">Futura</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                          {formatShortCompetency(inst.invoiceMonth || inst.competencyMonth)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs sm:text-sm tabular-nums">
                          {formatFullDate(inst.dueDate)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-xs sm:text-sm tabular-nums",
                            isPaid ? "text-emerald-400 font-medium" : "text-muted-foreground",
                          )}
                        >
                          {paymentDateLabel}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-xs sm:text-sm tabular-nums",
                            isCurrent ? "font-bold text-foreground" : "font-medium",
                          )}
                        >
                          {formatCurrency(Math.abs(Number(inst.amount)))}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {isPaid ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] gap-1 px-2 py-0.5"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Paga
                            </Badge>
                          ) : isCurrent ? (
                            <Badge
                              variant="outline"
                              className="bg-primary/15 text-primary border-primary/40 text-[10px] gap-1 px-2 py-0.5 font-semibold"
                            >
                              <Clock className="w-3 h-3" />
                              Em aberto
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] gap-1 px-2 py-0.5"
                            >
                              <Clock className="w-3 h-3" />
                              Futura
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            {onEdit && !isVirtualTx && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit();
                }}
                className="gap-1.5 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                Editar
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onDelete();
                }}
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5" />
                Excluir
              </Button>
            )}
          </div>

          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

