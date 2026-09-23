"use client";

import { getTransactionFormData } from "@/app/actions/form-data";
import { createTransaction } from "@/app/actions/transactions";
import { CategoryIcon } from "@/components/category-icon";
import { QuickCategoryDialog } from "@/components/quick-category-dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectableCard } from "@/components/ui/selectable-card";
import { Switch } from "@/components/ui/switch";
import { transactions } from "@/db/schema";
import { calculateCreditCardDueDate } from "@/lib/utils/competency";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard as CreditCardIcon,
  Landmark,
  Lock,
  Plus,
  ReceiptText,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type FormData = NonNullable<Awaited<ReturnType<typeof getTransactionFormData>>>;
type Category = FormData["categories"][0];
type Subcategory = Category["subcategories"][0];
type Account = FormData["accounts"][0];
type CreditCard = FormData["creditCards"][0];
type NewTransaction = typeof transactions.$inferInsert;

export function TransactionFormDialog({
  trigger,
  onSuccess,
  initialTab = "expense",
}: {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  initialTab?: "expense" | "income" | "transfer";
} = {}) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [formError, setFormError] = useState("");

  const [tab, setTab] = useState<"expense" | "income" | "transfer">(initialTab);
  const [step, setStep] = useState(1);

  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [launchDate, setLaunchDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [isDueDateManuallyEdited, setIsDueDateManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");

  const [expenseType, setExpenseType] = useState("single");
  const [currentInstallment, setCurrentInstallment] = useState("1");
  const [installmentTotal, setInstallmentTotal] = useState("2");
  const [isTotalAmount, setIsTotalAmount] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState("account");
  const [accountId, setAccountId] = useState("");
  const [selectedCreditCardId, setSelectedCreditCardId] = useState("");
  const [selectedInvoiceMonth, setSelectedInvoiceMonth] = useState("");

  const [accountIdIncome, setAccountIdIncome] = useState("");

  const [accountIdTransferOrigin, setAccountIdTransferOrigin] = useState("");
  const [accountIdTransferDest, setAccountIdTransferDest] = useState("");

  const [isPaid, setIsPaid] = useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const router = useRouter();

  useEffect(() => {
    if (open && !formData) {
      getTransactionFormData().then(setFormData);
    }
  }, [open, formData]);

  const resetState = (nextTab?: "expense" | "income" | "transfer") => {
    setStep(1);
    setTab(nextTab ?? initialTab);
    setAmount(undefined);
    setLaunchDate(format(new Date(), "yyyy-MM-dd"));
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setIsDueDateManuallyEdited(false);
    setDescription("");
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    setExpenseType("single");
    setCurrentInstallment("1");
    setInstallmentTotal("2");
    setIsTotalAmount(true);
    setPaymentMethod("account");
    setAccountId("");
    setSelectedCreditCardId("");
    setSelectedInvoiceMonth("");
    setAccountIdIncome("");
    setAccountIdTransferOrigin("");
    setAccountIdTransferDest("");
    setIsPaid(false);
    setFormError("");
  };

  const handleTabChange = (newTab: "expense" | "income" | "transfer") => {
    setTab(newTab);
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    setPaymentMethod("account");
    setAccountId("");
    setSelectedCreditCardId("");
    setSelectedInvoiceMonth("");
    setAccountIdIncome("");
    setAccountIdTransferOrigin("");
    setAccountIdTransferDest("");
    setIsPaid(false);
    setFormError("");
  };

  const getDefaultInvoiceMonth = (closingDay: number, dateStr: string): string => {
    const baseDate = parseISO(dateStr);
    if (baseDate.getDate() >= closingDay) {
      const next = addMonths(baseDate, 1);
      return format(next, "yyyy-MM");
    }
    return format(baseDate, "yyyy-MM");
  };

  const calculatedCardDueDate = useMemo(() => {
    if (paymentMethod !== "credit_card" || !selectedCreditCardId || !formData?.creditCards) return null;
    const card = formData.creditCards.find((c: CreditCard) => c.id === Number(selectedCreditCardId));
    if (!card) return null;
    if (selectedInvoiceMonth && /^\d{4}-\d{2}$/.test(selectedInvoiceMonth)) {
      const [year, month] = selectedInvoiceMonth.split("-").map(Number);
      const invoiceDate = new Date(year, month - 1, card.dueDay);
      return format(invoiceDate, "yyyy-MM-dd");
    }
    const calculated = calculateCreditCardDueDate(parseISO(launchDate), card.closingDay, card.dueDay);
    return format(calculated, "yyyy-MM-dd");
  }, [paymentMethod, selectedCreditCardId, formData, selectedInvoiceMonth, launchDate]);

  const effectiveDueDate = paymentMethod === "credit_card" && calculatedCardDueDate ? calculatedCardDueDate : dueDate;
  const isPastOrToday = effectiveDueDate <= todayStr;

  const invoiceOptions = useMemo(() => {
    if (!selectedCreditCardId || !formData?.creditCards) return [];
    const card = formData.creditCards.find((c: CreditCard) => c.id === Number(selectedCreditCardId));
    if (!card) return [];

    const defaultMonth = getDefaultInvoiceMonth(card.closingDay, launchDate);
    const [year, month] = defaultMonth.split("-").map(Number);
    const baseDate = new Date(year, month - 1, 1);

    const options: { value: string; label: string }[] = [];
    for (let i = -3; i < 7; i++) {
      const d = addMonths(baseDate, i);
      const value = format(d, "yyyy-MM");
      const label = format(d, "MMMM/yyyy", { locale: ptBR });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      options.push({ value, label: capitalizedLabel });
    }
    return options;
  }, [selectedCreditCardId, formData, launchDate]);

  const handleCreditCardChange = (value: string) => {
    setSelectedCreditCardId(value);
  };

  useEffect(() => {
    if (selectedCreditCardId && formData?.creditCards) {
      const card = formData.creditCards.find((c: CreditCard) => c.id === Number(selectedCreditCardId));
      if (card) {
        // eslint-disable-next-line
        setSelectedInvoiceMonth(getDefaultInvoiceMonth(card.closingDay, launchDate));
      }
    }
  }, [selectedCreditCardId, launchDate, formData]);

  const filteredCategories = useMemo(() => {
    if (!formData?.categories) return [];
    const targetType = tab === "income" ? "income" : "expense";
    return formData.categories.filter((c: Category) => c.type === targetType);
  }, [formData, tab]);

  const activeSubcategories = useMemo(() => {
    if (!formData?.categories || !selectedCategoryId) return [];
    const cat = formData.categories.find((c: Category) => c.id === Number(selectedCategoryId));
    return cat?.subcategories || [];
  }, [formData, selectedCategoryId]);

  const handleCategoryChange = (val: string) => {
    setSelectedCategoryId(val);
    if (!formData?.categories) {
      setSelectedSubcategoryId("");
      return;
    }
    const cat = formData.categories.find((c: Category) => c.id === Number(val));
    const subcats = cat?.subcategories || [];
    if (subcats.length > 0) {
      setSelectedSubcategoryId(String(subcats[0].id));
    } else {
      setSelectedSubcategoryId("");
    }
  };

  const handleCategoryCreated = async (newCategoryId: string, newSubcategoryId: string) => {
    const data = await getTransactionFormData();
    setFormData(data);
    setSelectedCategoryId(newCategoryId);

    if (newSubcategoryId) {
      setSelectedSubcategoryId(newSubcategoryId);
    } else {
      const cat = data.categories.find((c) => c.id === Number(newCategoryId));
      const geralSub = cat?.subcategories.find((sc) => sc.name === "Geral");
      if (geralSub) {
        setSelectedSubcategoryId(String(geralSub.id));
      } else {
        setSelectedSubcategoryId("");
      }
    }
  };

  const getSteps = () => {
    if (tab === "expense") {
      const steps = [1, 2, 3, 4];
      if (paymentMethod === "account" && isPastOrToday) steps.push(5);
      steps.push(6);
      return steps;
    }
    if (tab === "income") {
      const steps = [1, 2, 3, 4];
      if (isPastOrToday) steps.push(5);
      steps.push(6);
      return steps;
    }
    if (tab === "transfer") {
      return [1, 2, 3, 4, 6];
    }
    return [1, 6];
  };

  const stepsList = getSteps();
  const currentIndex = stepsList.indexOf(step);
  const isLastStep = currentIndex === stepsList.length - 1;
  const isFirstStep = currentIndex === 0;

  const handleNextStep = () => {
    if (tab === "expense") {
      if (step === 1 && !description.trim()) return toast.error("Preencha a descrição");
      if (step === 2 && (!amount || !launchDate || !effectiveDueDate))
        return toast.error("Preencha o valor e as datas");
      if (step === 3 && !selectedCategoryId) return toast.error("Selecione uma categoria");
      if (step === 4) {
        if (expenseType === "installment" && (!currentInstallment || !installmentTotal))
          return toast.error("Preencha as parcelas");
        if (paymentMethod === "account" && !accountId) return toast.error("Selecione uma conta");
        if (paymentMethod === "credit_card") {
          if (!selectedCreditCardId || !selectedInvoiceMonth) return toast.error("Selecione o cartão e a fatura");
          // Validar fatura fechada ao avançar
          const card = formData?.creditCards?.find((c: CreditCard) => c.id === Number(selectedCreditCardId));
          if (card) {
            const [year, month] = selectedInvoiceMonth.split("-").map(Number);
            const closingDate = new Date(year, month - 1, card.closingDay);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (today >= closingDate) {
              if (!window.confirm("Esta fatura já está fechada. Deseja realmente incluir uma despesa nela?")) {
                return;
              }
            }
          }
        }
      }
    } else if (tab === "income") {
      if (step === 1 && !description.trim()) return toast.error("Preencha a descrição");
      if (step === 2 && (!amount || !launchDate || !effectiveDueDate))
        return toast.error("Preencha o valor e as datas");
      if (step === 3 && !selectedCategoryId) return toast.error("Selecione uma categoria");
      if (step === 4) {
        if (expenseType === "installment" && (!currentInstallment || !installmentTotal))
          return toast.error("Preencha as parcelas");
        if (!accountIdIncome) return toast.error("Selecione a conta");
      }
    } else if (tab === "transfer") {
      if (step === 1 && !description.trim()) return toast.error("Preencha a descrição");
      if (step === 2 && (!amount || !launchDate || !effectiveDueDate))
        return toast.error("Preencha o valor e as datas");
      if (step === 3) {
        if (!accountIdTransferOrigin || !accountIdTransferDest) return toast.error("Selecione as contas");
        if (accountIdTransferOrigin === accountIdTransferDest)
          return toast.error("Contas de origem e destino devem ser diferentes");
      }
      if (step === 4 && expenseType === "installment" && (!currentInstallment || !installmentTotal))
        return toast.error("Preencha as parcelas");
    }

    setStep(stepsList[currentIndex + 1]);
  };

  const handlePrevStep = () => {
    setStep(stepsList[currentIndex - 1]);
  };

  const handleSubmit = async (action: "save-and-close" | "save-and-continue") => {
    setIsPending(true);
    setFormError("");

    const competencyMonth = effectiveDueDate.substring(0, 7);

    const baseData: Partial<NewTransaction> & Record<string, unknown> = {
      description,
      amount: amount?.toString(),
      dueDate: effectiveDueDate,
      launchDate: launchDate,
      competencyMonth,
      categoryId: selectedCategoryId ? Number(selectedCategoryId) : undefined,
      subcategoryId: selectedSubcategoryId ? Number(selectedSubcategoryId) : undefined,
      status: isPaid && isPastOrToday ? "paid" : "pending",
    };

    if (tab === "expense") {
      const isCreditCard = paymentMethod === "credit_card";
      baseData.type = isCreditCard ? "credit_card_expense" : "expense";

      if (isCreditCard) {
        baseData.creditCardId = Number(selectedCreditCardId);
        if (selectedInvoiceMonth) {
          baseData.competencyMonth = selectedInvoiceMonth;
          baseData.invoiceMonth = selectedInvoiceMonth;
        }
      } else {
        baseData.accountId = Number(accountId);
      }

      baseData.isFixed = expenseType === "fixed";
      if (expenseType === "installment") {
        baseData.installmentTotal = Number(installmentTotal);
        baseData.current_installment = Number(currentInstallment);
        baseData.isTotalAmount = isTotalAmount;
      }
    } else if (tab === "income") {
      baseData.type = "income";
      baseData.accountId = Number(accountIdIncome);
      baseData.isFixed = expenseType === "fixed";
      if (expenseType === "installment") {
        baseData.installmentTotal = Number(installmentTotal);
        baseData.current_installment = Number(currentInstallment);
        baseData.isTotalAmount = isTotalAmount;
      }
    } else if (tab === "transfer") {
      baseData.type = "transfer";
      baseData.accountId = Number(accountIdTransferOrigin);
      baseData.destinationAccountId = Number(accountIdTransferDest);
      baseData.isFixed = expenseType === "fixed";
      if (expenseType === "installment") {
        baseData.installmentTotal = Number(installmentTotal);
        baseData.current_installment = Number(currentInstallment);
        baseData.isTotalAmount = isTotalAmount;
      }
    }

    const res = await createTransaction(baseData as NewTransaction);

    setIsPending(false);
    if (res.success) {
      toast.success("Transação salva com sucesso!");
      if (action === "save-and-continue") {
        resetState(tab);
      } else {
        setOpen(false);
        resetState();
      }
      if (onSuccess) onSuccess();
      router.refresh();
    } else {
      toast.error(res.error || "Erro ao salvar a transação.");
      setFormError(res.error || "Erro ao salvar a transação.");
    }
  };

  const renderSummary = () => {
    return (
      <div className="bg-muted/30 border rounded-xl p-3 sm:p-6 space-y-3 sm:space-y-4 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />

        <div className="flex flex-col items-center justify-center border-b pb-3 sm:pb-4 mb-3 sm:mb-4 border-dashed">
          <ReceiptText className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-1 sm:mb-2 opacity-80" />
          <h3 className="font-semibold text-base sm:text-lg">Resumo da Transação</h3>
          <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-widest">
            {tab === "expense" ? "Despesa" : tab === "income" ? "Receita" : "Transferência"}
          </p>
        </div>

        <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between items-center bg-background p-2 rounded-md">
            <span className="text-muted-foreground">Valor:</span>
            <span className="font-medium text-base sm:text-lg text-primary">
              R$ {amount?.toFixed(2).replace(".", ",")}
            </span>
          </div>
          <div className="flex justify-between items-center bg-background p-2 rounded-md">
            <span className="text-muted-foreground">Lançamento:</span>
            <span className="font-medium">{launchDate ? format(parseISO(launchDate), "dd/MM/yyyy") : "-"}</span>
          </div>
          <div className="flex justify-between items-center bg-background p-2 rounded-md">
            <span className="text-muted-foreground">Vencimento:</span>
            <span className="font-medium">
              {effectiveDueDate ? format(parseISO(effectiveDueDate), "dd/MM/yyyy") : "-"}
              {paymentMethod === "credit_card" && <span className="text-xs text-muted-foreground ml-1">(Fatura)</span>}
            </span>
          </div>
          <div className="flex justify-between items-center bg-background p-2 rounded-md">
            <span className="text-muted-foreground">Descrição:</span>
            <span className="font-medium text-right max-w-[60%] truncate">{description}</span>
          </div>
          {tab !== "transfer" && (
            <div className="flex justify-between items-center bg-background p-2 rounded-md">
              <span className="text-muted-foreground">Categoria:</span>
              <span className="font-medium text-right max-w-[60%] truncate">
                {formData?.categories.find((c) => c.id === Number(selectedCategoryId))?.name}
                {selectedSubcategoryId &&
                  ` - ${activeSubcategories.find((s) => s.id === Number(selectedSubcategoryId))?.name}`}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center bg-background p-2 rounded-md">
            <span className="text-muted-foreground">Tipo:</span>
            <span className="font-medium">
              {expenseType === "single"
                ? "Única"
                : expenseType === "fixed"
                  ? "Fixa"
                  : `Parcelada (${currentInstallment}/${installmentTotal})`}
            </span>
          </div>
          {tab === "expense" && (
            <div className="flex justify-between items-center bg-background p-2 rounded-md">
              <span className="text-muted-foreground">Pagamento:</span>
              <span className="font-medium text-right max-w-[60%] truncate">
                {paymentMethod === "account"
                  ? formData?.accounts.find((a) => a.id === Number(accountId))?.name
                  : `Cartão: ${formData?.creditCards.find((c) => c.id === Number(selectedCreditCardId))?.name} (${selectedInvoiceMonth})`}
              </span>
            </div>
          )}
          {tab === "income" && (
            <div className="flex justify-between items-center bg-background p-2 rounded-md">
              <span className="text-muted-foreground">Conta:</span>
              <span className="font-medium">
                {formData?.accounts.find((a) => a.id === Number(accountIdIncome))?.name}
              </span>
            </div>
          )}
          {tab === "transfer" && (
            <>
              <div className="flex justify-between items-center bg-background p-2 rounded-md">
                <span className="text-muted-foreground">Origem:</span>
                <span className="font-medium">
                  {formData?.accounts.find((a) => a.id === Number(accountIdTransferOrigin))?.name}
                </span>
              </div>
              <div className="flex justify-between items-center bg-background p-2 rounded-md">
                <span className="text-muted-foreground">Destino:</span>
                <span className="font-medium">
                  {formData?.accounts.find((a) => a.id === Number(accountIdTransferDest))?.name}
                </span>
              </div>
            </>
          )}
          {stepsList.includes(5) && (
            <div className="flex justify-between items-center bg-background p-2 rounded-md">
              <span className="text-muted-foreground">Situação:</span>
              <span className={`font-medium ${isPaid ? "text-emerald-500" : "text-orange-500"}`}>
                {isPaid ? (tab === "expense" ? "Pago" : "Recebido") : "Pendente"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const stepNames: Record<number, string> = {
    1: "Identificação",
    2: "Valor e Datas",
    3: "Categoria",
    4: "Configuração",
    5: "Situação",
    6: "Resumo",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) resetState();
      }}
    >
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button className="cursor-pointer fixed bottom-20 right-4 z-50 md:hidden rounded-full h-14 w-14 shadow-2xl p-0 bg-primary text-white hover:brightness-110 transition-all hover:scale-110 active:scale-95 border-none flex items-center justify-center">
            <Plus className="h-7 w-7 pointer-events-none" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[95dvh] overflow-y-auto p-3 sm:p-6 bg-background">
        <DialogHeader className="mb-2">
          {/* Indicador de Progresso Dinâmico */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-primary font-bold uppercase tracking-wider">
              Passo {currentIndex + 1} de {stepsList.length} • {stepNames[step]}
            </span>
            <div className="h-1 bg-white/10 rounded-full w-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / stepsList.length) * 100}%` }}
              />
            </div>
          </div>
          <DialogTitle className="sr-only">Nova Transação</DialogTitle>
          <DialogDescription className="sr-only">
            Preencha os detalhes para registrar uma nova transação financeira.
          </DialogDescription>
        </DialogHeader>

        {open && formData ? (
          <div className="w-full flex flex-col h-full">
            {/* Segmented Control - Seletor de Tipo */}
            {step === 1 ? (
              <div className="bg-[#1A1A22] p-1 rounded-xl flex w-full mb-6">
                <button
                  type="button"
                  className={`flex-1 rounded-lg text-sm font-medium transition-all py-2 flex items-center justify-center gap-2 cursor-pointer ${tab === "expense" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => handleTabChange("expense")}
                >
                  {tab === "expense" && <div className="w-2 h-2 rounded-full bg-rose-500" />}
                  Despesa
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-lg text-sm font-medium transition-all py-2 flex items-center justify-center gap-2 cursor-pointer ${tab === "income" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => handleTabChange("income")}
                >
                  {tab === "income" && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                  Receita
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-lg text-sm font-medium transition-all py-2 flex items-center justify-center gap-2 cursor-pointer ${tab === "transfer" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => handleTabChange("transfer")}
                >
                  {tab === "transfer" && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  Transferência
                </button>
              </div>
            ) : (
              <div className="bg-[#1A1A22]/60 border border-white/5 p-1 rounded-xl flex w-full mb-6">
                <div
                  className="w-full rounded-lg text-sm font-medium py-2 flex items-center justify-center gap-2 bg-background/50 text-foreground/80 cursor-not-allowed select-none"
                  aria-disabled="true"
                >
                  {tab === "expense" && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Despesa</span>
                    </>
                  )}
                  {tab === "income" && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Receita</span>
                    </>
                  )}
                  {tab === "transfer" && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Transferência</span>
                    </>
                  )}
                  <Lock className="h-3.5 w-3.5 text-muted-foreground/70 ml-1" />
                </div>
              </div>
            )}

            <div className="min-h-[200px] sm:min-h-[280px] flex flex-col justify-center">
              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h2 className="text-xl font-medium text-center mb-6">Como deseja chamar?</h2>
                  <div className="grid gap-3">
                    <Label className="text-muted-foreground ml-1">Descrição</Label>
                    <Input
                      name="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleNextStep();
                      }}
                      placeholder="Ex: Mercado, Salário..."
                      className="h-14 text-lg text-center"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h2 className="text-xl font-medium text-center mb-6">Qual o valor e as datas?</h2>
                  <div className="grid gap-3">
                    <Label className="text-muted-foreground ml-1">Valor</Label>
                    <CurrencyInput
                      name="amount"
                      value={amount}
                      onValueChange={setAmount}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleNextStep();
                      }}
                      className="h-14 text-2xl text-center font-semibold"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground ml-1">Data de Lançamento</Label>
                        <span className="text-[11px] text-muted-foreground">Quando ocorreu</span>
                      </div>
                      <DatePicker
                        id="launchDate"
                        name="launchDate"
                        value={launchDate}
                        onChange={(val) => {
                          setLaunchDate(val);
                          if (!isDueDateManuallyEdited) {
                            setDueDate(val);
                          }
                        }}
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground ml-1">Data de Vencimento</Label>
                        <span className="text-[11px] text-muted-foreground">Pagamento</span>
                      </div>
                      <DatePicker
                        id="dueDate"
                        name="dueDate"
                        value={dueDate}
                        onChange={(val) => {
                          setDueDate(val);
                          setIsDueDateManuallyEdited(true);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && tab !== "transfer" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h2 className="text-xl font-medium text-center mb-6">Como deseja categorizar?</h2>
                  <div className="grid gap-5">
                    <div className="grid gap-3">
                      <Label className="text-muted-foreground ml-1">Categoria</Label>
                      <div className="flex gap-2">
                        <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
                          <SelectTrigger className="w-full h-14 rounded-xl border-transparent bg-muted/40 px-4 text-lg hover:bg-muted/60 transition-all outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredCategories.map((c: Category) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                <div className="flex items-center gap-2">
                                  <CategoryIcon name={c.icon} className="h-5 w-5 text-muted-foreground" />
                                  <span>{c.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <QuickCategoryDialog
                          type={tab === "income" ? "income" : "expense"}
                          onSuccess={handleCategoryCreated}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <Label className="text-muted-foreground ml-1">Subcategoria</Label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedSubcategoryId}
                          onValueChange={setSelectedSubcategoryId}
                          disabled={!selectedCategoryId}
                        >
                          <SelectTrigger className="flex h-14 w-full rounded-xl border-transparent bg-muted/40 px-4 text-lg hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10 disabled:opacity-50">
                            <SelectValue
                              placeholder={activeSubcategories.length === 0 ? "Nenhuma subcategoria" : "Selecione..."}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {activeSubcategories.map((sc: Subcategory) => (
                              <SelectItem key={sc.id} value={String(sc.id)}>
                                {sc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <QuickCategoryDialog
                          type={tab === "income" ? "income" : "expense"}
                          onSuccess={(catId, subCatId) => {
                            handleCategoryCreated(catId, subCatId);
                            setSelectedSubcategoryId(subCatId);
                          }}
                          isSubcategoryMode={true}
                          parentCategoryId={selectedCategoryId}
                          parentCategoryName={filteredCategories.find((c) => String(c.id) === selectedCategoryId)?.name}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && tab === "transfer" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h2 className="text-xl font-medium text-center mb-6">De onde para onde?</h2>
                  <div className="grid gap-3">
                    <Label className="text-muted-foreground ml-1">Conta de Origem (Sai dinheiro)</Label>
                    <Select value={accountIdTransferOrigin} onValueChange={setAccountIdTransferOrigin}>
                      <SelectTrigger className="flex h-14 w-full rounded-xl border-transparent bg-muted/40 px-4 text-lg hover:bg-muted/60 transition-all">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.accounts.map((a: Account) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3">
                    <Label className="text-muted-foreground ml-1">Conta de Destino (Entra dinheiro)</Label>
                    <Select value={accountIdTransferDest} onValueChange={setAccountIdTransferDest}>
                      <SelectTrigger className="flex h-14 w-full rounded-xl border-transparent bg-muted/40 px-4 text-lg hover:bg-muted/60 transition-all">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.accounts.map((a: Account) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h2 className="text-xl font-medium text-center mb-6">Como isso vai funcionar?</h2>

                  {/* Recorrência */}
                  <div className="grid gap-3">
                    <Label className="text-muted-foreground ml-1">Recorrência</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <SelectableCard
                        icon={<Zap className="w-5 h-5" />}
                        title="Única"
                        subtitle="Sem repetições"
                        selected={expenseType === "single"}
                        onClick={() => setExpenseType("single")}
                      />
                      <SelectableCard
                        icon={<RefreshCw className="w-5 h-5" />}
                        title="Fixa"
                        subtitle="Mensal"
                        selected={expenseType === "fixed"}
                        onClick={() => setExpenseType("fixed")}
                      />
                      <SelectableCard
                        icon={<Calendar className="w-5 h-5" />}
                        title="Parcelada"
                        subtitle="Dividir valor"
                        selected={expenseType === "installment"}
                        onClick={() => setExpenseType("installment")}
                      />
                    </div>
                  </div>

                  {expenseType === "installment" && (
                    <div className="space-y-5 animate-in slide-in-from-bottom-2">
                      <div className="grid grid-cols-2 gap-5">
                        <div className="grid gap-3">
                          <Label className="text-muted-foreground ml-1">Parcela Atual/Inicial</Label>
                          <Input
                            type="number"
                            min="1"
                            value={currentInstallment}
                            onChange={(e) => setCurrentInstallment(e.target.value)}
                            className="h-12 text-center text-lg"
                          />
                        </div>
                        <div className="grid gap-3">
                          <Label className="text-muted-foreground ml-1">Total de Parcelas</Label>
                          <Input
                            type="number"
                            min="2"
                            value={installmentTotal}
                            onChange={(e) => setInstallmentTotal(e.target.value)}
                            className="h-12 text-center text-lg"
                          />
                        </div>
                      </div>
                      <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background">
                        <div className="space-y-0.5">
                          <Label className="text-base cursor-pointer" onClick={() => setIsTotalAmount(!isTotalAmount)}>
                            O valor é o total da compra?
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Ativo: Divide o valor. Inativo: Valor de cada parcela.
                          </p>
                        </div>
                        <Switch checked={isTotalAmount} onCheckedChange={setIsTotalAmount} />
                      </div>
                    </div>
                  )}

                  {/* Payment Method (Expense) */}
                  {tab === "expense" && (
                    <>
                      <div className="grid gap-3 mt-6 border-t pt-6 border-white/5">
                        <Label className="text-muted-foreground ml-1">Forma de Pagamento</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <SelectableCard
                            icon={<Landmark className="w-5 h-5" />}
                            title="Conta"
                            subtitle="Saldo à vista"
                            selected={paymentMethod === "account"}
                            onClick={() => setPaymentMethod("account")}
                            layout="horizontal"
                          />
                          <SelectableCard
                            icon={<CreditCardIcon className="w-5 h-5" />}
                            title="Crédito"
                            subtitle="Fatura"
                            selected={paymentMethod === "credit_card"}
                            onClick={() => setPaymentMethod("credit_card")}
                            layout="horizontal"
                          />
                        </div>
                      </div>

                      {paymentMethod === "account" && (
                        <div className="grid gap-3 animate-in fade-in">
                          <Label className="text-muted-foreground ml-1">Selecione a Conta</Label>
                          <Select value={accountId} onValueChange={setAccountId}>
                            <SelectTrigger className="h-14 w-full rounded-xl text-lg">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {formData.accounts.map((a: Account) => (
                                <SelectItem key={a.id} value={String(a.id)}>
                                  {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {paymentMethod === "credit_card" && (
                        <div className="space-y-5 animate-in fade-in">
                          <div className="grid gap-3">
                            <div className="flex justify-between items-end">
                              <Label className="text-muted-foreground ml-1">Cartão de Crédito</Label>
                              {selectedCreditCardId &&
                                formData.creditCards.find((c: CreditCard) => c.id === Number(selectedCreditCardId)) && (
                                  <span className="text-xs text-primary font-medium">
                                    Limite Disp.: R${" "}
                                    {Number(
                                      formData.creditCards.find(
                                        (c: CreditCard) => c.id === Number(selectedCreditCardId),
                                      )?.creditLimit,
                                    ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                            </div>
                            <Select value={selectedCreditCardId} onValueChange={handleCreditCardChange}>
                              <SelectTrigger className="h-16 w-full rounded-xl px-4 py-3 flex items-center justify-between">
                                <SelectValue placeholder="Selecione o cartão..." />
                              </SelectTrigger>
                              <SelectContent>
                                {formData.creditCards.map((c: CreditCard) => (
                                  <SelectItem
                                    key={c.id}
                                    value={String(c.id)}
                                    className="py-2.5 px-3 cursor-pointer rounded-lg my-0.5"
                                  >
                                    <div className="flex flex-col text-left gap-1 py-0.5">
                                      <span className="text-sm font-medium leading-tight">{c.name}</span>
                                      <span className="text-xs text-muted-foreground leading-tight">
                                        Vence dia {c.dueDay}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedCreditCardId && invoiceOptions.length > 0 && (
                            <div className="grid gap-3">
                              <div className="flex justify-between items-end">
                                <Label className="text-muted-foreground ml-1">Fatura</Label>
                                <span className="text-xs text-muted-foreground">
                                  Fecha dia{" "}
                                  {
                                    formData.creditCards.find((c: CreditCard) => c.id === Number(selectedCreditCardId))
                                      ?.closingDay
                                  }
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                                {invoiceOptions.slice(3, 7).map(
                                  (
                                    opt, // Show only the most relevant ones (e.g., current and next 3)
                                  ) => (
                                    <SelectableCard
                                      key={opt.value}
                                      title={opt.label}
                                      subtitle={`Vencimento em ${opt.value}`}
                                      selected={selectedInvoiceMonth === opt.value}
                                      onClick={() => setSelectedInvoiceMonth(opt.value)}
                                      layout="horizontal"
                                      className="p-3"
                                    />
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {tab === "income" && (
                    <div className="grid gap-3 mt-6 border-t pt-6">
                      <Label className="text-muted-foreground ml-1">Depositar na Conta</Label>
                      <Select value={accountIdIncome} onValueChange={setAccountIdIncome}>
                        <SelectTrigger className="h-14 w-full rounded-xl text-lg bg-muted/40">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.accounts.map((a: Account) => (
                            <SelectItem key={a.id} value={String(a.id)}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h2 className="text-xl font-medium text-center mb-6">Qual a situação atual?</h2>
                  <div className="flex flex-col items-center justify-center p-8 rounded-xl border bg-muted/20 gap-6">
                    <Label className="text-xl text-center cursor-pointer" onClick={() => setIsPaid(!isPaid)}>
                      {tab === "expense" ? "Essa despesa já foi paga?" : "Essa receita já foi recebida?"}
                    </Label>
                    <Switch checked={isPaid} onCheckedChange={setIsPaid} className="scale-150" />
                    <p className="text-muted-foreground text-center max-w-sm mt-4">
                      {isPaid
                        ? tab === "expense"
                          ? "Marcado como Pago. O valor será deduzido do saldo."
                          : "Marcado como Recebido. O valor será adicionado ao saldo."
                        : "Marcado como Pendente. Não afetará o saldo atual da conta ainda."}
                    </p>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  {renderSummary()}
                  {formError && <p className="text-sm text-destructive text-center">{formError}</p>}
                </div>
              )}
            </div>

            <div className="pt-4 sm:pt-8 flex flex-wrap justify-between gap-2 sm:gap-3 mt-3 sm:mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handlePrevStep}
                isLoading={isPending}
                disabled={isFirstStep || isPending}
                className="min-w-[100px] sm:w-32"
              >
                <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" /> Voltar
              </Button>

              {!isLastStep ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="min-w-[100px] sm:w-32 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full"
                >
                  Próximo <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleSubmit("save-and-continue")}
                    isLoading={isPending}
                    disabled={isPending}
                    className="text-xs sm:text-sm px-2 sm:px-4 rounded-full"
                  >
                    <>
                      <Plus className="mr-1 sm:mr-2 h-4 w-4" /> Adicionar Outra
                    </>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSubmit("save-and-close")}
                    isLoading={isPending}
                    disabled={isPending}
                    className="bg-primary text-primary-foreground hover:brightness-110 font-semibold rounded-full border-none text-xs sm:text-sm px-2 sm:px-4"
                  >
                    <>
                      <Check className="mr-1 sm:mr-2 h-4 w-4" /> Finalizar
                    </>
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : open ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
            Carregando formulário...
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
