"use client";

import { getTransactionFormData } from "@/app/actions/form-data";
import { createTransaction } from "@/app/actions/transactions";
import {
  AmbientGlow,
  AmountCard,
  ClosedInvoiceDialog,
  DatesCard,
  DetailsCard,
  FormFooter,
  FormHeader,
  PaymentCard,
  RecurrenceCard,
  type Category,
  type FormData,
  type RecurrenceKind,
} from "@/components/transaction-form";
import {
  getTransactionAccent,
  type AccentColorConfig,
  type TransactionTab,
} from "@/components/transaction-theme";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { orderByMostUsedCategory } from "@/lib/category-utils";
import { addMonths, format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
  const [kind, setKind] = useState<RecurrenceKind>("single");
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

  const accent: AccentColorConfig = useMemo(() => getTransactionAccent(tab), [tab]);

  const categories = useMemo(
    () =>
      orderByMostUsedCategory(
        data?.categories.filter((item: Category) => item.type === (tab === "income" ? "income" : "expense")) ?? [],
      ),
    [data, tab],
  );

  const selectedCategory = useMemo(
    () => categories.find((item: Category) => item.id === Number(categoryId)),
    [categories, categoryId],
  );

  const subcategories = useMemo(
    () => selectedCategory?.subcategories ?? [],
    [selectedCategory],
  );

  const card = useMemo(
    () => data?.creditCards.find((item) => item.id === Number(cardId)),
    [data?.creditCards, cardId],
  );

  const invoiceOptions = useMemo(() => {
    if (!card) return [];
    const date = parseISO(launchDate);
    const defaultMonth = date.getDate() >= card.closingDay ? addMonths(date, 1) : date;
    const base = new Date(defaultMonth.getFullYear(), defaultMonth.getMonth(), 1);
    return [0, 1, 2, 3].map((offset) => addMonths(base, offset));
  }, [card, launchDate]);

  const effectiveDueDate = useMemo(() => {
    if (payment === "credit_card" && card && invoiceMonth) {
      return `${invoiceMonth}-${String(card.dueDay).padStart(2, "0")}`;
    }
    return dueEdited ? dueDate : launchDate;
  }, [payment, card, invoiceMonth, dueEdited, dueDate, launchDate]);

  const canShowStatus = useMemo(
    () => (tab === "income" || payment === "account") && effectiveDueDate <= today(),
    [tab, payment, effectiveDueDate],
  );

  const monthlyAmount = useMemo(
    () => (amount ? (isTotalAmount ? amount / Math.max(Number(totalInstallments), 1) : amount) : 0),
    [amount, isTotalAmount, totalInstallments],
  );

  const reset = useCallback((nextTab = tab) => {
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
  }, [tab]);

  const changeTab = useCallback((next: TransactionTab) => {
    setTab(next);
    setCategoryId("");
    setSubcategoryId("");
    setPayment("account");
    setAccountId("");
    setCardId("");
    setInvoiceMonth("");
  }, []);

  const chooseCategory = useCallback((value: string) => {
    setCategoryId(value);
    const first = data?.categories.find((item: Category) => item.id === Number(value))?.subcategories?.[0];
    setSubcategoryId(first ? String(first.id) : "");
  }, [data?.categories]);

  const handleCard = useCallback((value: string) => {
    setCardId(value);
    const next = data?.creditCards.find((item) => item.id === Number(value));
    if (next) {
      const date = parseISO(launchDate);
      const month = date.getDate() >= next.closingDay ? addMonths(date, 1) : date;
      setInvoiceMonth(format(month, "yyyy-MM"));
    }
  }, [data?.creditCards, launchDate]);

  const handleLaunchDate = useCallback((value: string) => {
    setLaunchDate(value);
    if (!dueEdited && payment !== "credit_card") {
      setDueDate(value);
    }
    if (card) {
      const date = parseISO(value);
      const month = date.getDate() >= card.closingDay ? addMonths(date, 1) : date;
      setInvoiceMonth(format(month, "yyyy-MM"));
    }
  }, [dueEdited, payment, card]);

  const handleDueDateChange = useCallback((value: string) => {
    setDueDate(value);
    setDueEdited(true);
    setIsPaid(value <= today());
  }, []);

  const handleToggleStatus = useCallback(() => {
    setIsPaid((prev) => !prev);
  }, []);

  const handleQuickCategoryCreated = useCallback(async (newCategoryId: string, newSubcategoryId: string) => {
    const nextData = await getTransactionFormData();
    setData(nextData);
    setCategoryId(newCategoryId);
    setSubcategoryId(newSubcategoryId);
  }, []);

  const save = useCallback(async (close: boolean, confirmed = false) => {
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
  }, [
    amount,
    description,
    tab,
    categoryId,
    originId,
    destinationId,
    payment,
    accountId,
    cardId,
    invoiceMonth,
    incomeAccountId,
    card,
    effectiveDueDate,
    launchDate,
    subcategoryId,
    isPaid,
    kind,
    totalInstallments,
    installment,
    isTotalAmount,
    initialTab,
    onSuccess,
    reset,
    router,
  ]);

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
          overlayClassName="fixed inset-0 z-50 bg-background/80 backdrop-blur-md transition-colors duration-500 overflow-hidden flex items-end sm:items-center justify-center p-0 sm:p-4"
          overlayChildren={<AmbientGlow accent={accent} />}
          className="fixed z-50 flex flex-col overflow-hidden gap-0 p-0 text-foreground border-0 outline-none top-auto bottom-0 left-0 right-0 translate-x-0 translate-y-0 w-full max-w-full rounded-t-3xl rounded-b-none max-h-[92vh] sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-xl sm:rounded-[28px] sm:max-h-[88vh] bg-[var(--card-elevated)]/75 backdrop-blur-2xl"
          style={{
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
          <DialogTitle className="sr-only">Cadastrar Transação</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para adicionar nova despesa, receita ou transferência
          </DialogDescription>

          {/* Header */}
          <FormHeader tab={tab} accent={accent} onTabChange={changeTab} />

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-4.5 scrollbar-thin">
            {/* 1. Value and Status */}
            <AmountCard
              amount={amount}
              onAmountChange={setAmount}
              tab={tab}
              accent={accent}
              canShowStatus={canShowStatus}
              isPaid={isPaid}
              onToggleStatus={handleToggleStatus}
            />

            {/* 2. Description, Category, Subcategory or Transfer Accounts */}
            <DetailsCard
              tab={tab}
              description={description}
              onDescriptionChange={setDescription}
              categoryId={categoryId}
              onCategoryChange={chooseCategory}
              categories={categories}
              selectedCategory={selectedCategory}
              subcategoryId={subcategoryId}
              onSubcategoryChange={setSubcategoryId}
              subcategories={subcategories}
              accounts={data?.accounts ?? []}
              originId={originId}
              onOriginChange={setOriginId}
              destinationId={destinationId}
              onDestinationChange={setDestinationId}
              onQuickCategoryCreated={handleQuickCategoryCreated}
            />

            {/* 3. Liquidation / Payment */}
            <PaymentCard
              tab={tab}
              accent={accent}
              payment={payment}
              onPaymentChange={setPayment}
              accountId={accountId}
              onAccountIdChange={setAccountId}
              incomeAccountId={incomeAccountId}
              onIncomeAccountIdChange={setIncomeAccountId}
              accounts={data?.accounts ?? []}
              cardId={cardId}
              onCardChange={handleCard}
              creditCards={data?.creditCards ?? []}
              card={card}
              invoiceOptions={invoiceOptions}
              invoiceMonth={invoiceMonth}
              onInvoiceMonthChange={setInvoiceMonth}
            />

            {/* 4. Dates */}
            <DatesCard
              launchDate={launchDate}
              onLaunchDateChange={handleLaunchDate}
              effectiveDueDate={effectiveDueDate}
              onDueDateChange={handleDueDateChange}
              isCreditCard={payment === "credit_card"}
            />

            {/* 5. Recurrence and Installments */}
            <RecurrenceCard
              accent={accent}
              kind={kind}
              onKindChange={setKind}
              installment={installment}
              onInstallmentChange={setInstallment}
              totalInstallments={totalInstallments}
              onTotalInstallmentsChange={setTotalInstallments}
              isTotalAmount={isTotalAmount}
              onIsTotalAmountChange={setIsTotalAmount}
              monthlyAmount={monthlyAmount}
            />
          </div>

          {/* Footer */}
          <FormFooter
            accent={accent}
            kind={kind}
            installment={installment}
            totalInstallments={totalInstallments}
            amount={amount}
            monthlyAmount={monthlyAmount}
            pending={pending}
            onSave={save}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Closed Invoice */}
      <ClosedInvoiceDialog
        open={closedInvoice}
        onOpenChange={setClosedInvoice}
        accent={accent}
        onConfirm={() => {
          setClosedInvoice(false);
          save(closeAfterSave, true);
        }}
      />
    </>
  );
}
