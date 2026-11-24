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
  type TransactionFormErrors,
  type TransactionFormField,
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const today = () => format(new Date(), "yyyy-MM-dd");

const FIELD_ORDER: readonly TransactionFormField[] = [
  "amount",
  "description",
  "categoryId",
  "subcategoryId",
  "originId",
  "destinationId",
  "accountId",
  "incomeAccountId",
  "cardId",
  "invoiceMonth",
  "installment",
  "totalInstallments",
];

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
  const [errors, setErrors] = useState<TransactionFormErrors>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    getTransactionFormData()
      .then((freshData) => {
        if (!cancelled) {
          setData(freshData);
        }
      })
      .catch((error: unknown) => {
        console.error("Erro ao carregar dados do formulário:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

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
    return [-1, 0, 1, 2].map((offset) => addMonths(base, offset));
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

  const clearFieldErrors = useCallback((...fields: TransactionFormField[]) => {
    setErrors((prev) => {
      const hasAny = fields.some((field) => prev[field] !== undefined);
      if (!hasAny) return prev;
      const next: TransactionFormErrors = { ...prev };
      for (const field of fields) {
        delete next[field];
      }
      return next;
    });
  }, []);

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
    setErrors({});
  }, [tab]);

  const changeTab = useCallback((next: TransactionTab) => {
    setTab(next);
    setCategoryId("");
    setSubcategoryId("");
    setPayment("account");
    setAccountId("");
    setCardId("");
    setInvoiceMonth("");
    setErrors({});
  }, []);

  const handleAmountChange = useCallback(
    (value: number | undefined) => {
      setAmount(value);
      clearFieldErrors("amount");
    },
    [clearFieldErrors],
  );

  const handleDescriptionChange = useCallback(
    (value: string) => {
      setDescription(value);
      clearFieldErrors("description");
    },
    [clearFieldErrors],
  );

  const chooseCategory = useCallback((value: string) => {
    setCategoryId(value);
    const first = data?.categories.find((item: Category) => item.id === Number(value))?.subcategories?.[0];
    setSubcategoryId(first ? String(first.id) : "");
    clearFieldErrors("categoryId", "subcategoryId");
  }, [data?.categories, clearFieldErrors]);

  const handleSubcategoryChange = useCallback(
    (value: string) => {
      setSubcategoryId(value);
      clearFieldErrors("subcategoryId");
    },
    [clearFieldErrors],
  );

  const handleOriginChange = useCallback(
    (value: string) => {
      setOriginId(value);
      clearFieldErrors("originId", "destinationId");
    },
    [clearFieldErrors],
  );

  const handleDestinationChange = useCallback(
    (value: string) => {
      setDestinationId(value);
      clearFieldErrors("destinationId");
    },
    [clearFieldErrors],
  );

  const handlePaymentChange = useCallback(
    (value: "account" | "credit_card") => {
      setPayment(value);
      clearFieldErrors("accountId", "cardId", "invoiceMonth");
    },
    [clearFieldErrors],
  );

  const handleAccountIdChange = useCallback(
    (value: string) => {
      setAccountId(value);
      clearFieldErrors("accountId");
    },
    [clearFieldErrors],
  );

  const handleIncomeAccountIdChange = useCallback(
    (value: string) => {
      setIncomeAccountId(value);
      clearFieldErrors("incomeAccountId");
    },
    [clearFieldErrors],
  );

  const handleCard = useCallback((value: string) => {
    setCardId(value);
    const next = data?.creditCards.find((item) => item.id === Number(value));
    if (next) {
      const date = parseISO(launchDate);
      const month = date.getDate() >= next.closingDay ? addMonths(date, 1) : date;
      setInvoiceMonth(format(month, "yyyy-MM"));
    }
    clearFieldErrors("cardId", "invoiceMonth");
  }, [data?.creditCards, launchDate, clearFieldErrors]);

  const handleInvoiceMonthChange = useCallback(
    (value: string) => {
      setInvoiceMonth(value);
      clearFieldErrors("invoiceMonth");
    },
    [clearFieldErrors],
  );

  const handleKindChange = useCallback(
    (value: RecurrenceKind) => {
      setKind(value);
      clearFieldErrors("installment", "totalInstallments");
    },
    [clearFieldErrors],
  );

  const handleInstallmentChange = useCallback(
    (value: string) => {
      setInstallment(value);
      clearFieldErrors("installment", "totalInstallments");
    },
    [clearFieldErrors],
  );

  const handleTotalInstallmentsChange = useCallback(
    (value: string) => {
      setTotalInstallments(value);
      clearFieldErrors("installment", "totalInstallments");
    },
    [clearFieldErrors],
  );

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
    clearFieldErrors("categoryId", "subcategoryId");
  }, [clearFieldErrors]);

  const save = useCallback(async (close: boolean, confirmed = false) => {
    const nextErrors: TransactionFormErrors = {};

    if (!amount || amount <= 0) {
      nextErrors.amount = "Informe um valor maior que zero.";
    }
    if (!description.trim()) {
      nextErrors.description = "Informe uma descrição.";
    }
    if (tab !== "transfer") {
      if (!categoryId) {
        nextErrors.categoryId = "Selecione uma categoria.";
      } else if (!subcategoryId) {
        nextErrors.subcategoryId =
          subcategories.length === 0
            ? "Crie uma subcategoria usando o botão +."
            : "Selecione uma subcategoria.";
      }
    } else {
      if (!originId) {
        nextErrors.originId = "Selecione a conta de origem.";
      }
      if (!destinationId) {
        nextErrors.destinationId = "Selecione a conta de destino.";
      } else if (originId && originId === destinationId) {
        nextErrors.destinationId = "A conta de destino deve ser diferente da origem.";
      }
    }

    if (tab === "expense" && payment === "account" && !accountId) {
      nextErrors.accountId = "Selecione a conta para a despesa.";
    }
    if (tab === "expense" && payment === "credit_card") {
      if (!cardId) {
        nextErrors.cardId = "Selecione um cartão de crédito.";
      }
      if (cardId && !invoiceMonth) {
        nextErrors.invoiceMonth = "Selecione a fatura de lançamento.";
      }
    }
    if (tab === "income" && !incomeAccountId) {
      nextErrors.incomeAccountId = "Selecione a conta de destino.";
    }

    if (kind === "installment") {
      const parsedTotal = Number(totalInstallments);
      const parsedInstallment = Number(installment);
      if (!Number.isInteger(parsedTotal) || parsedTotal < 2) {
        nextErrors.totalInstallments = "Informe pelo menos 2 parcelas.";
      }
      if (!Number.isInteger(parsedInstallment) || parsedInstallment < 1) {
        nextErrors.installment = "A parcela inicial deve ser no mínimo 1.";
      } else if (Number.isInteger(parsedTotal) && parsedTotal >= 2 && parsedInstallment > parsedTotal) {
        nextErrors.installment = "A parcela inicial não pode ser maior que o total.";
      }
    }

    const firstInvalidField = FIELD_ORDER.find((field) => Boolean(nextErrors[field]));
    if (firstInvalidField) {
      setErrors(nextErrors);
      toast.error(nextErrors[firstInvalidField] ?? "Verifique os campos obrigatórios.");
      const target = scrollContainerRef.current?.querySelector<HTMLElement>(`[data-field="${firstInvalidField}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setErrors({});

    if (tab === "expense" && payment === "credit_card" && card && !confirmed) {
      const closeDate = `${invoiceMonth}-${String(card.closingDay).padStart(2, "0")}`;
      if (closeDate <= today()) {
        setCloseAfterSave(close);
        return setClosedInvoice(true);
      }
    }

    setPending(true);
    try {
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

      if (!result.success) {
        toast.error(result.error || "Não foi possível salvar a transação.");
        return;
      }

      toast.success("Transação salva com sucesso!");
      if (close) {
        setOpen(false);
        reset(initialTab);
      } else {
        reset(tab);
        getTransactionFormData()
          .then(setData)
          .catch((error: unknown) => {
            console.error("Erro ao atualizar dados do formulário:", error);
          });
      }
      onSuccess?.();
      router.refresh();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao salvar a transação. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }, [
    amount,
    description,
    tab,
    categoryId,
    subcategoryId,
    subcategories.length,
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
          } else {
            setErrors({});
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
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-4.5 scrollbar-thin"
          >
            {/* 1. Value and Status */}
            <AmountCard
              amount={amount}
              onAmountChange={handleAmountChange}
              tab={tab}
              accent={accent}
              canShowStatus={canShowStatus}
              isPaid={isPaid}
              onToggleStatus={handleToggleStatus}
              error={errors.amount}
            />

            {/* 2. Description, Category, Subcategory or Transfer Accounts */}
            <DetailsCard
              tab={tab}
              description={description}
              onDescriptionChange={handleDescriptionChange}
              categoryId={categoryId}
              onCategoryChange={chooseCategory}
              categories={categories}
              selectedCategory={selectedCategory}
              subcategoryId={subcategoryId}
              onSubcategoryChange={handleSubcategoryChange}
              subcategories={subcategories}
              accounts={data?.accounts ?? []}
              originId={originId}
              onOriginChange={handleOriginChange}
              destinationId={destinationId}
              onDestinationChange={handleDestinationChange}
              onQuickCategoryCreated={handleQuickCategoryCreated}
              errors={errors}
            />

            {/* 3. Liquidation / Payment */}
            <PaymentCard
              tab={tab}
              accent={accent}
              payment={payment}
              onPaymentChange={handlePaymentChange}
              accountId={accountId}
              onAccountIdChange={handleAccountIdChange}
              incomeAccountId={incomeAccountId}
              onIncomeAccountIdChange={handleIncomeAccountIdChange}
              accounts={data?.accounts ?? []}
              cardId={cardId}
              onCardChange={handleCard}
              creditCards={data?.creditCards ?? []}
              card={card}
              invoiceOptions={invoiceOptions}
              invoiceMonth={invoiceMonth}
              onInvoiceMonthChange={handleInvoiceMonthChange}
              errors={errors}
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
              onKindChange={handleKindChange}
              installment={installment}
              onInstallmentChange={handleInstallmentChange}
              totalInstallments={totalInstallments}
              onTotalInstallmentsChange={handleTotalInstallmentsChange}
              isTotalAmount={isTotalAmount}
              onIsTotalAmountChange={setIsTotalAmount}
              monthlyAmount={monthlyAmount}
              errors={errors}
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
