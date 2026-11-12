"use client";

import { getTransactionFormData } from "@/app/actions/form-data";
import { createTransaction } from "@/app/actions/transactions";
import { QuickCategoryDialog } from "@/components/quick-category-dialog";
import {
  MIDNIGHT_TOKENS,
  TRANSACTION_ACCENTS,
  type AccentColorConfig,
  type TransactionTab,
} from "@/components/transaction-theme";
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
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectableCard } from "@/components/ui/selectable-card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type FormData = NonNullable<Awaited<ReturnType<typeof getTransactionFormData>>>;
type Category = FormData["categories"][number];
type Account = FormData["accounts"][number];
type Card = FormData["creditCards"][number];

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const today = () => format(new Date(), "yyyy-MM-dd");

export interface TransactionFormDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  initialTab?: TransactionTab;
}

export function TransactionFormDialog({
  trigger,
  onSuccess,
  initialTab = "expense",
}: TransactionFormDialogProps = {}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FormData | null>(null);
  const [tab, setTab] = useState<TransactionTab>(initialTab);
  const [amount, setAmount] = useState<number | undefined>();
  const [description, setDescription] = useState("");
  const [launchDate, setLaunchDate] = useState(today());
  const [dueDate, setDueDate] = useState(today());
  const [dueEdited, setDueEdited] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [payment, setPayment] = useState<"account" | "credit_card">("account");
  const [accountId, setAccountId] = useState("");
  const [incomeAccountId, setIncomeAccountId] = useState("");
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [cardId, setCardId] = useState("");
  const [invoiceMonth, setInvoiceMonth] = useState("");
  const [kind, setKind] = useState<"single" | "fixed" | "installment">("single");
  const [installment, setInstallment] = useState("1");
  const [totalInstallments, setTotalInstallments] = useState("2");
  const [isTotalAmount, setIsTotalAmount] = useState(true);
  const [isPaid, setIsPaid] = useState(true);
  const [pending, setPending] = useState(false);
  const [closedInvoice, setClosedInvoice] = useState(false);
  const [closeAfterSave, setCloseAfterSave] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (open && !data) {
      getTransactionFormData().then(setData);
    }
  }, [open, data]);

  const accent: AccentColorConfig = TRANSACTION_ACCENTS[tab];

  const categories = useMemo(
    () => data?.categories.filter((item: Category) => item.type === (tab === "income" ? "income" : "expense")) ?? [],
    [data, tab],
  );

  const selectedCategory = categories.find((item: Category) => item.id === Number(categoryId));
  const subcategories = selectedCategory?.subcategories ?? [];
  const card = data?.creditCards.find((item: Card) => item.id === Number(cardId));

  const invoiceOptions = useMemo(() => {
    if (!card) return [];
    const date = parseISO(launchDate);
    const defaultMonth = date.getDate() >= card.closingDay ? addMonths(date, 1) : date;
    const base = new Date(defaultMonth.getFullYear(), defaultMonth.getMonth(), 1);
    return [0, 1, 2, 3].map((offset) => addMonths(base, offset));
  }, [card, launchDate]);

  const effectiveDueDate =
    payment === "credit_card" && card && invoiceMonth
      ? `${invoiceMonth}-${String(card.dueDay).padStart(2, "0")}`
      : dueEdited
        ? dueDate
        : launchDate;

  const canShowStatus = (tab === "income" || payment === "account") && effectiveDueDate <= today();
  const monthlyAmount = amount ? (isTotalAmount ? amount / Math.max(Number(totalInstallments), 1) : amount) : 0;

  const reset = (nextTab = tab) => {
    setTab(nextTab);
    setAmount(undefined);
    setDescription("");
    setLaunchDate(today());
    setDueDate(today());
    setDueEdited(false);
    setCategoryId("");
    setSubcategoryId("");
    setPayment("account");
    setAccountId("");
    setIncomeAccountId("");
    setOriginId("");
    setDestinationId("");
    setCardId("");
    setInvoiceMonth("");
    setKind("single");
    setInstallment("1");
    setTotalInstallments("2");
    setIsTotalAmount(true);
    setIsPaid(true);
  };

  const changeTab = (next: TransactionTab) => {
    setTab(next);
    setCategoryId("");
    setSubcategoryId("");
    setPayment("account");
    setAccountId("");
    setCardId("");
    setInvoiceMonth("");
  };

  const chooseCategory = (value: string) => {
    setCategoryId(value);
    const first = data?.categories.find((item: Category) => item.id === Number(value))?.subcategories?.[0];
    setSubcategoryId(first ? String(first.id) : "");
  };

  const handleCard = (value: string) => {
    setCardId(value);
    const next = data?.creditCards.find((item: Card) => item.id === Number(value));
    if (next) {
      const date = parseISO(launchDate);
      const month = date.getDate() >= next.closingDay ? addMonths(date, 1) : date;
      setInvoiceMonth(format(month, "yyyy-MM"));
    }
  };

  const handleLaunchDate = (value: string) => {
    setLaunchDate(value);
    if (!dueEdited && payment !== "credit_card") {
      setDueDate(value);
    }
    if (card) {
      const date = parseISO(value);
      const month = date.getDate() >= card.closingDay ? addMonths(date, 1) : date;
      setInvoiceMonth(format(month, "yyyy-MM"));
    }
  };

  const save = async (close: boolean, confirmed = false) => {
    if (!amount || !description.trim()) {
      return toast.error("Informe descrição e valor.");
    }
    if (tab !== "transfer" && !categoryId) {
      return toast.error("Selecione uma categoria.");
    }
    if (tab === "transfer" && (!originId || !destinationId || originId === destinationId)) {
      return toast.error("Escolha contas diferentes para origem e destino.");
    }
    if (tab === "expense" && payment === "account" && !accountId) {
      return toast.error("Selecione a conta para a despesa.");
    }
    if (tab === "expense" && payment === "credit_card" && (!cardId || !invoiceMonth)) {
      return toast.error("Selecione o cartão e a fatura.");
    }
    if (tab === "income" && !incomeAccountId) {
      return toast.error("Selecione a conta de destino.");
    }

    if (tab === "expense" && payment === "credit_card" && card && !confirmed) {
      const closeDate = `${invoiceMonth}-${String(card.closingDay).padStart(2, "0")}`;
      if (closeDate <= today()) {
        setCloseAfterSave(close);
        return setClosedInvoice(true);
      }
    }

    setPending(true);
    const result = await createTransaction({
      description,
      amount: String(amount),
      dueDate: effectiveDueDate,
      launchDate,
      competencyMonth: effectiveDueDate.slice(0, 7),
      categoryId: categoryId ? Number(categoryId) : undefined,
      subcategoryId: subcategoryId ? Number(subcategoryId) : undefined,
      status: isPaid && effectiveDueDate <= today() ? "paid" : "pending",
      type: tab === "expense" ? (payment === "credit_card" ? "credit_card_expense" : "expense") : tab,
      accountId:
        tab === "expense"
          ? payment === "account"
            ? Number(accountId)
            : undefined
          : tab === "income"
            ? Number(incomeAccountId)
            : Number(originId),
      creditCardId: tab === "expense" && payment === "credit_card" ? Number(cardId) : undefined,
      invoiceMonth: payment === "credit_card" ? invoiceMonth : undefined,
      isFixed: kind === "fixed",
      installmentTotal: kind === "installment" ? Number(totalInstallments) : undefined,
      current_installment: kind === "installment" ? Number(installment) : undefined,
      isTotalAmount: kind === "installment" ? isTotalAmount : undefined,
      destinationAccountId: tab === "transfer" ? Number(destinationId) : undefined,
    });
    setPending(false);

    if (!result.success) {
      return toast.error(result.error || "Não foi possível salvar a transação.");
    }

    toast.success("Transação salva com sucesso!");
    if (close) {
      setOpen(false);
      reset(initialTab);
    } else {
      reset(tab);
    }
    onSuccess?.();
    router.refresh();
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (value) {
            setTab(initialTab);
          }
        }}
      >
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

        <DialogContent
          showCloseButton={false}
          overlayClassName="fixed inset-0 z-50 bg-[#0B1220]/75 backdrop-blur-md transition-colors duration-500 overflow-hidden flex items-end sm:items-center justify-center p-0 sm:p-4"
          overlayChildren={
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {/* Dynamic upper diffuse glow */}
              <div
                className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[680px] h-[400px] rounded-full blur-[110px] opacity-75 transition-all duration-700 ease-out"
                style={{
                  background: `radial-gradient(circle, ${accent.glow} 0%, transparent 70%)`,
                }}
              />
              {/* Electric blue depth glow on the right */}
              <div
                className="absolute top-[28%] right-[8%] w-[480px] h-[360px] rounded-full blur-[120px] pointer-events-none opacity-40"
                style={{
                  background: "radial-gradient(circle, rgba(99, 155, 255, 0.16) 0%, transparent 70%)",
                }}
              />
              {/* Deep midnight ambient vignette */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(11,18,32,0.85)_100%)]" />
            </div>
          }
          className="fixed z-50 flex flex-col overflow-hidden gap-0 p-0 text-[#F2F5FA] border-0 outline-none top-auto bottom-0 left-0 right-0 translate-x-0 translate-y-0 w-full max-w-full rounded-t-3xl rounded-b-none max-h-[92vh] sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-xl sm:rounded-[28px] sm:max-h-[88vh]"
          style={{
            background: "rgba(21, 31, 49, 0.68)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
            boxShadow: `
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              inset 0 0 0 1px rgba(255, 255, 255, 0.03),
              0 28px 64px -12px rgba(0, 0, 0, 0.78),
              0 14px 28px -8px rgba(0, 0, 0, 0.5),
              0 0 60px -10px ${accent.subtleGlow}
            `,
          }}
        >
          {/* Header as independent glass surface */}
          <DialogHeader
            className="shrink-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-3.5 space-y-0"
            style={{
              background: "rgba(17, 26, 42, 0.72)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.10)",
            }}
          >
            <DialogTitle className="sr-only">Nova transação</DialogTitle>

            {/* Mobile sheet pull handle */}
            <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-2 sm:hidden shrink-0" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold tracking-wide text-[#F2F5FA]">
                  Nova transação
                </span>
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full transition-colors duration-300 flex items-center gap-1.5"
                  style={{
                    backgroundColor: accent.softBg,
                    borderColor: accent.border,
                    borderWidth: 1,
                    color: accent.primary,
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: accent.primary }}
                  />
                  {accent.name}
                </span>
              </div>

              <DialogClose asChild>
                <button
                  type="button"
                  className="size-8 rounded-full flex items-center justify-center text-[#A7B3C5] hover:text-[#F2F5FA] bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="size-4" />
                </button>
              </DialogClose>
            </div>

            {/* Segmented control for Type */}
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#0B1220]/70 p-1 border border-white/[0.06] backdrop-blur-md">
              {(["expense", "income", "transfer"] as TransactionTab[]).map((item) => {
                const isSelected = tab === item;
                const tabConfig = TRANSACTION_ACCENTS[item];
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => changeTab(item)}
                    className="relative flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all duration-200 cursor-pointer"
                    style={
                      isSelected
                        ? {
                            backgroundColor: tabConfig.elevatedBg,
                            borderColor: tabConfig.border,
                            borderWidth: 1,
                            color: "#F2F5FA",
                            boxShadow: `0 2px 10px ${tabConfig.subtleGlow}`,
                          }
                        : {
                            color: "#A7B3C5",
                          }
                    }
                  >
                    <span
                      className="size-2 rounded-full transition-transform duration-200"
                      style={{
                        backgroundColor: tabConfig.primary,
                        transform: isSelected ? "scale(1.15)" : "scale(1)",
                        boxShadow: isSelected ? `0 0 8px ${tabConfig.primary}` : "none",
                      }}
                    />
                    <span>{tabConfig.name}</span>
                  </button>
                );
              })}
            </div>
          </DialogHeader>

          {/* Scrollable content with layered glass cards */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-4.5 scrollbar-thin">
            {/* 1. Value and Status Glass Card */}
            <GlassCard elevated>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#718096]">
                  Valor da transação
                </span>
                {canShowStatus && (
                  <button
                    type="button"
                    onClick={() => setIsPaid(!isPaid)}
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer",
                      isPaid
                        ? "bg-[#132A28]/90 text-[#42D6A0] border-[#28634F] shadow-[0_0_12px_rgba(66,214,160,0.15)]"
                        : "bg-[#2A2215]/90 text-[#F59E0B] border-[#5E441D] shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                    )}
                  >
                    {isPaid ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <Clock className="size-3.5" />
                    )}
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
                  onValueChange={setAmount}
                  className="h-12 min-w-0 text-3xl sm:text-4xl font-bold tabular-nums bg-transparent border-0 p-0 text-[#F2F5FA] placeholder:text-[#526176] focus-visible:ring-0 focus-visible:outline-none"
                  placeholder="0,00"
                  autoFocus
                />
              </div>
            </GlassCard>

            {/* 2. Description and Categories Glass Card */}
            <GlassCard className="space-y-4">
              <Field label="Descrição">
                <div className="relative">
                  <ReceiptText className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#718096]" />
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      tab === "expense"
                        ? "Ex: Supermercado, Almoço..."
                        : tab === "income"
                          ? "Ex: Salário, Rendimentos..."
                          : "Ex: PIX entre contas..."
                    }
                    className="h-11 pl-10 rounded-xl bg-[#101A2A]/90 hover:bg-[#151F31]/90 border-[#29384E] hover:border-white/20 text-[#F2F5FA] placeholder:text-[#718096] transition-all duration-200"
                    style={{
                      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                    }}
                  />
                </div>
              </Field>

              {tab !== "transfer" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Categoria">
                    <div className="flex items-center gap-2">
                      <Select value={categoryId} onValueChange={chooseCategory}>
                        <SelectTrigger
                          className="w-full flex-1 !h-11 rounded-xl px-3.5 bg-[#101A2A]/90 hover:bg-[#151F31]/90 border-[#29384E] hover:border-white/20 text-[#F2F5FA] transition-all duration-200"
                          style={{
                            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                          }}
                        >
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent className="z-[120] rounded-xl border border-white/10 bg-[#111A2A]/95 p-1 text-[#F2F5FA] shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                          {categories.map((item: Category) => (
                            <SelectItem
                              key={item.id}
                              value={String(item.id)}
                              className="hover:bg-white/[0.08] focus:bg-white/[0.10] text-[#F2F5FA] rounded-lg cursor-pointer"
                            >
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <QuickCategoryDialog
                        type={tab === "income" ? "income" : "expense"}
                        triggerClassName="!h-11 !w-11 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.10] text-[#A7B3C5] hover:text-[#F2F5FA] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] cursor-pointer"
                        onSuccess={async (id, sub) => {
                          const nextData = await getTransactionFormData();
                          setData(nextData);
                          setCategoryId(id);
                          setSubcategoryId(sub);
                        }}
                      />
                    </div>
                  </Field>

                  <Field label="Subcategoria">
                    <div className="flex items-center gap-2">
                      <Select
                        value={subcategoryId}
                        onValueChange={setSubcategoryId}
                        disabled={!categoryId}
                      >
                        <SelectTrigger
                          className="w-full flex-1 !h-11 rounded-xl px-3.5 bg-[#101A2A]/90 hover:bg-[#151F31]/90 border-[#29384E] hover:border-white/20 text-[#F2F5FA] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                          }}
                        >
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent className="z-[120] rounded-xl border border-white/10 bg-[#111A2A]/95 p-1 text-[#F2F5FA] shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                          {subcategories.map((item) => (
                            <SelectItem
                              key={item.id}
                              value={String(item.id)}
                              className="hover:bg-white/[0.08] focus:bg-white/[0.10] text-[#F2F5FA] rounded-lg cursor-pointer"
                            >
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {categoryId ? (
                        <QuickCategoryDialog
                          type={tab === "income" ? "income" : "expense"}
                          isSubcategoryMode={true}
                          parentCategoryId={categoryId}
                          parentCategoryName={selectedCategory?.name}
                          triggerClassName="!h-11 !w-11 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.10] text-[#A7B3C5] hover:text-[#F2F5FA] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] cursor-pointer"
                          onSuccess={async (_id, sub) => {
                            const nextData = await getTransactionFormData();
                            setData(nextData);
                            setSubcategoryId(sub);
                          }}
                        />
                      ) : null}
                    </div>
                  </Field>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Conta de origem (Sai)">
                    <AccountSelect
                      value={originId}
                      onChange={setOriginId}
                      accounts={data?.accounts ?? []}
                    />
                  </Field>
                  <Field label="Conta de destino (Entra)">
                    <AccountSelect
                      value={destinationId}
                      onChange={setDestinationId}
                      accounts={data?.accounts ?? []}
                    />
                  </Field>
                </div>
              )}
            </GlassCard>

            {/* 3. Liquidation / Payment Method Glass Card */}
            {(tab === "expense" || tab === "income") && (
              <GlassCard className="space-y-4">
                {tab === "expense" && (
                  <>
                    <div>
                      <Label className="text-xs font-medium text-[#A7B3C5]">
                        Forma de liquidação
                      </Label>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <SelectableCard
                          icon={<Landmark />}
                          title="Conta"
                          subtitle="Saldo à vista"
                          selected={payment === "account"}
                          onClick={() => setPayment("account")}
                          activeAccent={accent}
                        />
                        <SelectableCard
                          icon={<CreditCard />}
                          title="Crédito"
                          subtitle="Fatura do cartão"
                          selected={payment === "credit_card"}
                          onClick={() => setPayment("credit_card")}
                          activeAccent={accent}
                        />
                      </div>
                    </div>

                    {payment === "account" ? (
                      <Field label="Selecione a conta">
                        <AccountSelect
                          value={accountId}
                          onChange={setAccountId}
                          accounts={data?.accounts ?? []}
                        />
                      </Field>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <Field
                          label={
                            <span className="flex items-center justify-between w-full">
                              <span>Cartão de crédito</span>
                              {card && (
                                <span className="font-medium text-[#42D6A0]">
                                  Limite: {money(Number(card.creditLimit))}
                                </span>
                              )}
                            </span>
                          }
                        >
                          <Select value={cardId} onValueChange={handleCard}>
                            <SelectTrigger
                              className="w-full !h-11 rounded-xl px-3.5 bg-[#101A2A]/90 hover:bg-[#151F31]/90 border-[#29384E] hover:border-white/20 text-[#F2F5FA] transition-all duration-200"
                              style={{
                                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                              }}
                            >
                              <SelectValue placeholder="Selecionar cartão" />
                            </SelectTrigger>
                            <SelectContent className="z-[120] rounded-xl border border-white/10 bg-[#111A2A]/95 p-1 text-[#F2F5FA] shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                              {data?.creditCards.map((item: Card) => (
                                <SelectItem
                                  key={item.id}
                                  value={String(item.id)}
                                  className="hover:bg-white/[0.08] focus:bg-white/[0.10] text-[#F2F5FA] rounded-lg cursor-pointer"
                                >
                                  <div className="flex items-center justify-between w-full gap-2">
                                    <span>{item.name}</span>
                                    <span className="text-xs text-[#718096]">
                                      Fecha dia {item.closingDay} • Vence dia {item.dueDay}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        {card && (
                          <div>
                            <div className="flex justify-between text-xs text-[#A7B3C5] mb-2 font-medium">
                              <span>Fatura de lançamento</span>
                              <span className="text-[#718096]">Fecha dia {card.closingDay}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              {invoiceOptions.map((month) => {
                                const value = format(month, "yyyy-MM");
                                const isSelected = invoiceMonth === value;
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => setInvoiceMonth(value)}
                                    className="flex flex-col items-center justify-center rounded-xl border p-2.5 text-sm font-semibold capitalize transition-all duration-200 cursor-pointer"
                                    style={
                                      isSelected
                                        ? {
                                            borderColor: accent.border,
                                            backgroundColor: accent.elevatedBg,
                                            color: "#F2F5FA",
                                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 14px ${accent.subtleGlow}`,
                                          }
                                        : {
                                            borderColor: "rgba(255, 255, 255, 0.08)",
                                            backgroundColor: "rgba(16, 26, 42, 0.8)",
                                            color: "#A7B3C5",
                                            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                                          }
                                    }
                                  >
                                    <span className="font-semibold text-sm">
                                      {format(month, "MMM/yy", { locale: ptBR })}
                                    </span>
                                    <span className="mt-1 block text-xs font-normal normal-case text-[#718096]">
                                      Vence dia {card.dueDay}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {tab === "income" && (
                  <Field label="Depositar na conta">
                    <AccountSelect
                      value={incomeAccountId}
                      onChange={setIncomeAccountId}
                      accounts={data?.accounts ?? []}
                    />
                  </Field>
                )}
              </GlassCard>
            )}

            {/* 4. Dates Glass Card */}
            <GlassCard>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Data de lançamento">
                  <DatePicker
                    value={launchDate}
                    onChange={handleLaunchDate}
                    className="h-11 rounded-xl px-3.5 bg-[#101A2A]/90 hover:bg-[#151F31]/90 border-[#29384E] hover:border-white/20 text-[#F2F5FA] transition-all duration-200"
                    popoverContentClassName="z-[120] rounded-2xl border border-white/10 bg-[#111A2A]/95 p-3 text-[#F2F5FA] shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
                  />
                </Field>
                <Field
                  label={
                    <span className="flex items-center justify-between">
                      <span>Data de vencimento</span>
                      {payment === "credit_card" && (
                        <span className="text-[11px] text-[#718096]">(Pela fatura)</span>
                      )}
                    </span>
                  }
                >
                  <DatePicker
                    value={effectiveDueDate}
                    onChange={(value) => {
                      setDueDate(value);
                      setDueEdited(true);
                      setIsPaid(value <= today());
                    }}
                    disabled={payment === "credit_card"}
                    className="h-11 rounded-xl px-3.5 bg-[#101A2A]/90 hover:bg-[#151F31]/90 border-[#29384E] hover:border-white/20 text-[#F2F5FA] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    popoverContentClassName="z-[120] rounded-2xl border border-white/10 bg-[#111A2A]/95 p-3 text-[#F2F5FA] shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
                  />
                </Field>
              </div>
            </GlassCard>

            {/* 5. Recurrence & Installments Glass Card */}
            <GlassCard className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-[#A7B3C5]">
                  Modalidade / Recorrência
                </Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <SelectableCard
                    icon={<Zap />}
                    title="Única"
                    subtitle="Sem repetição"
                    selected={kind === "single"}
                    onClick={() => setKind("single")}
                    activeAccent={accent}
                  />
                  <SelectableCard
                    icon={<RefreshCw />}
                    title="Fixa"
                    subtitle="Mensal · 12x"
                    selected={kind === "fixed"}
                    onClick={() => setKind("fixed")}
                    activeAccent={accent}
                  />
                  <SelectableCard
                    icon={<Calendar />}
                    title="Parcelada"
                    subtitle="Dividir valor"
                    selected={kind === "installment"}
                    onClick={() => setKind("installment")}
                    activeAccent={accent}
                  />
                </div>
              </div>

              {kind === "installment" && (
                <div
                  className="rounded-xl p-3.5 flex flex-col gap-3 transition-all duration-200"
                  style={{
                    backgroundColor: "rgba(16, 26, 42, 0.85)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Parcela inicial">
                      <Input
                        type="number"
                        min={1}
                        value={installment}
                        onChange={(e) => setInstallment(e.target.value)}
                        className="h-10 rounded-xl bg-[#0B1220]/80 border-[#29384E] text-[#F2F5FA] focus:border-[var(--accent)]"
                      />
                    </Field>
                    <Field label="Total de parcelas">
                      <Input
                        type="number"
                        min={2}
                        value={totalInstallments}
                        onChange={(e) => setTotalInstallments(e.target.value)}
                        className="h-10 rounded-xl bg-[#0B1220]/80 border-[#29384E] text-[#F2F5FA] focus:border-[var(--accent)]"
                      />
                    </Field>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <Label className="text-xs text-[#A7B3C5]">
                      O valor digitado é o total da compra?
                    </Label>
                    <Switch
                      checked={isTotalAmount}
                      onCheckedChange={setIsTotalAmount}
                      style={
                        isTotalAmount
                          ? {
                              backgroundColor: accent.primary,
                            }
                          : undefined
                      }
                    />
                  </div>

                  <p className="text-xs text-[#718096]">
                    Serão geradas {totalInstallments} parcelas de {money(monthlyAmount)} (residual ajustado na última).
                  </p>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Footer as independent glass surface */}
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
                onClick={() => save(false)}
                className="h-11 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.10] active:bg-white/[0.15] text-[#F2F5FA] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all font-medium cursor-pointer"
              >
                <Plus className="mr-1.5 size-4" />
                Adicionar outra
              </Button>
              <Button
                type="button"
                disabled={pending}
                onClick={() => save(true)}
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
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Closed Invoice */}
      <AlertDialog open={closedInvoice} onOpenChange={setClosedInvoice}>
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
              onClick={() => {
                setClosedInvoice(false);
                save(closeAfterSave, true);
              }}
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
    </>
  );
}

function GlassCard({
  children,
  className,
  elevated = false,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { elevated?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 sm:p-5 transition-all duration-200",
        className
      )}
      style={{
        background: elevated ? "rgba(21, 31, 49, 0.72)" : "rgba(17, 26, 42, 0.65)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 4px 16px rgba(0, 0, 0, 0.25)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label className="text-xs font-medium text-[#A7B3C5]">{label}</Label>
      {children}
    </div>
  );
}

function AccountSelect({
  value,
  onChange,
  accounts,
}: {
  value: string;
  onChange: (value: string) => void;
  accounts: Account[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="w-full !h-11 rounded-xl px-3.5 bg-[#101A2A]/90 hover:bg-[#151F31]/90 border-[#29384E] hover:border-white/20 text-[#F2F5FA] transition-all duration-200"
        style={{
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        }}
      >
        <SelectValue placeholder="Selecionar conta" />
      </SelectTrigger>
      <SelectContent className="z-[120] rounded-xl border border-white/10 bg-[#111A2A]/95 p-1 text-[#F2F5FA] shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        {accounts.map((item: Account) => (
          <SelectItem
            key={item.id}
            value={String(item.id)}
            className="hover:bg-white/[0.08] focus:bg-white/[0.10] text-[#F2F5FA] rounded-lg cursor-pointer"
          >
            <div className="flex items-center justify-between w-full gap-2">
              <span>{item.name}</span>
              {item.currentBalance != null ? (
                <span className="text-xs text-[#718096]">
                  {money(Number(item.currentBalance))}
                </span>
              ) : null}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
