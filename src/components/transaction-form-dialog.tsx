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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { transactions } from "@/db/schema";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Loader2, ChevronRight, ChevronLeft, ReceiptText, Check } from "lucide-react";
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
}: { trigger?: React.ReactNode; onSuccess?: () => void } = {}) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [formError, setFormError] = useState("");

  const [tab, setTab] = useState("expense");
  const [step, setStep] = useState(1);

  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [transactionDate, setTransactionDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
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
  const isPastOrToday = transactionDate <= todayStr;

  const router = useRouter();

  useEffect(() => {
    if (open && !formData) {
      getTransactionFormData().then(setFormData);
    }
  }, [open, formData]);

  const resetState = () => {
    setStep(1);
    setAmount(undefined);
    setTransactionDate(format(new Date(), "yyyy-MM-dd"));
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

  const getDefaultInvoiceMonth = (closingDay: number, dateStr: string): string => {
    const baseDate = parseISO(dateStr);
    if (baseDate.getDate() >= closingDay) {
      const next = addMonths(baseDate, 1);
      return format(next, "yyyy-MM");
    }
    return format(baseDate, "yyyy-MM");
  };

  const invoiceOptions = useMemo(() => {
    if (!selectedCreditCardId || !formData?.creditCards) return [];
    const card = formData.creditCards.find((c: CreditCard) => c.id === Number(selectedCreditCardId));
    if (!card) return [];

    const defaultMonth = getDefaultInvoiceMonth(card.closingDay, transactionDate);
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
  }, [selectedCreditCardId, formData?.creditCards, transactionDate]);

  const handleCreditCardChange = (value: string) => {
    setSelectedCreditCardId(value);
  };

  useEffect(() => {
    if (selectedCreditCardId && formData?.creditCards) {
      const card = formData.creditCards.find((c: CreditCard) => c.id === Number(selectedCreditCardId));
      if (card) {
        // eslint-disable-next-line
        setSelectedInvoiceMonth(getDefaultInvoiceMonth(card.closingDay, transactionDate));
      }
    }
  }, [selectedCreditCardId, transactionDate, formData?.creditCards]);

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
      const steps = [1, 2, 3, 4, 5];
      if (paymentMethod === "account" && isPastOrToday) steps.push(6);
      steps.push(7);
      return steps;
    }
    if (tab === "income") {
      const steps = [1, 2, 3, 4, 5];
      if (isPastOrToday) steps.push(6);
      steps.push(7);
      return steps;
    }
    if (tab === "transfer") {
      return [1, 2, 3, 4, 7];
    }
    return [1, 7];
  };

  const stepsList = getSteps();
  const currentIndex = stepsList.indexOf(step);
  const isLastStep = currentIndex === stepsList.length - 1;
  const isFirstStep = currentIndex === 0;

  const handleNextStep = () => {
    if (tab === "expense") {
      if (step === 1 && (!amount || !transactionDate)) return toast.error("Preencha o valor e a data");
      if (step === 2 && !description.trim()) return toast.error("Preencha a descrição");
      if (step === 3 && !selectedCategoryId) return toast.error("Selecione uma categoria");
      if (step === 4 && expenseType === "installment" && (!currentInstallment || !installmentTotal)) return toast.error("Preencha as parcelas");
      if (step === 5) {
         if (paymentMethod === "account" && !accountId) return toast.error("Selecione uma conta");
         if (paymentMethod === "credit_card") {
           if (!selectedCreditCardId || !selectedInvoiceMonth) return toast.error("Selecione o cartão e a fatura");
           // Validar fatura fechada ao avançar (para evitar surpresas no final)
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
      if (step === 1 && (!amount || !transactionDate)) return toast.error("Preencha o valor e a data");
      if (step === 2 && !description.trim()) return toast.error("Preencha a descrição");
      if (step === 3 && !selectedCategoryId) return toast.error("Selecione uma categoria");
      if (step === 4 && expenseType === "installment" && (!currentInstallment || !installmentTotal)) return toast.error("Preencha as parcelas");
      if (step === 5 && !accountIdIncome) return toast.error("Selecione a conta");
    } else if (tab === "transfer") {
      if (step === 1 && (!amount || !transactionDate)) return toast.error("Preencha o valor e a data");
      if (step === 2 && !description.trim()) return toast.error("Preencha a descrição");
      if (step === 3) {
        if (!accountIdTransferOrigin || !accountIdTransferDest) return toast.error("Selecione as contas");
        if (accountIdTransferOrigin === accountIdTransferDest) return toast.error("Contas de origem e destino devem ser diferentes");
      }
      if (step === 4 && expenseType === "installment" && (!currentInstallment || !installmentTotal)) return toast.error("Preencha as parcelas");
    }

    setStep(stepsList[currentIndex + 1]);
  };

  const handlePrevStep = () => {
    setStep(stepsList[currentIndex - 1]);
  };

  const handleSubmit = async (action: "save-and-close" | "save-and-continue") => {
    setIsPending(true);
    setFormError("");

    const competencyMonth = transactionDate.substring(0, 7);

    const baseData: Partial<NewTransaction> & Record<string, unknown> = {
      description,
      amount: amount?.toString(),
      date: transactionDate,
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
        resetState();
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

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center gap-2 mb-6 mt-2">
        {stepsList.map((s, idx) => (
          <div key={s} className="flex items-center">
            <div className={`h-2.5 w-2.5 rounded-full transition-all ${idx <= currentIndex ? 'bg-primary scale-110' : 'bg-muted'}`} />
            {idx < stepsList.length - 1 && (
              <div className={`h-[2px] w-4 mx-1 transition-all ${idx < currentIndex ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSummary = () => {
    return (
      <div className="bg-muted/30 border rounded-xl p-3 sm:p-6 space-y-3 sm:space-y-4 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
        
        <div className="flex flex-col items-center justify-center border-b pb-3 sm:pb-4 mb-3 sm:mb-4 border-dashed">
          <ReceiptText className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-1 sm:mb-2 opacity-80" />
          <h3 className="font-semibold text-base sm:text-lg">Resumo da Transação</h3>
          <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-widest">{tab === 'expense' ? 'Despesa' : tab === 'income' ? 'Receita' : 'Transferência'}</p>
        </div>

        <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between items-center bg-background p-2 rounded-md">
            <span className="text-muted-foreground">Valor:</span>
            <span className="font-medium text-base sm:text-lg text-primary">R$ {amount?.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between items-center bg-background p-2 rounded-md">
            <span className="text-muted-foreground">Data:</span>
            <span className="font-medium">{format(new Date(transactionDate), "dd/MM/yyyy")}</span>
          </div>
          <div className="flex justify-between items-center bg-background p-2 rounded-md">
            <span className="text-muted-foreground">Descrição:</span>
            <span className="font-medium text-right max-w-[60%] truncate">{description}</span>
          </div>
          {tab !== 'transfer' && (
            <div className="flex justify-between items-center bg-background p-2 rounded-md">
              <span className="text-muted-foreground">Categoria:</span>
              <span className="font-medium text-right max-w-[60%] truncate">
                {formData?.categories.find(c => c.id === Number(selectedCategoryId))?.name}
                {selectedSubcategoryId && ` - ${activeSubcategories.find(s => s.id === Number(selectedSubcategoryId))?.name}`}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center bg-background p-2 rounded-md">
            <span className="text-muted-foreground">Tipo:</span>
            <span className="font-medium">
              {expenseType === 'single' ? 'Única' : expenseType === 'fixed' ? 'Fixa' : `Parcelada (${currentInstallment}/${installmentTotal})`}
            </span>
          </div>
          {tab === 'expense' && (
            <div className="flex justify-between items-center bg-background p-2 rounded-md">
              <span className="text-muted-foreground">Pagamento:</span>
              <span className="font-medium text-right max-w-[60%] truncate">
                {paymentMethod === 'account' 
                  ? formData?.accounts.find(a => a.id === Number(accountId))?.name 
                  : `Cartão: ${formData?.creditCards.find(c => c.id === Number(selectedCreditCardId))?.name} (${selectedInvoiceMonth})`}
              </span>
            </div>
          )}
          {tab === 'income' && (
            <div className="flex justify-between items-center bg-background p-2 rounded-md">
              <span className="text-muted-foreground">Conta:</span>
              <span className="font-medium">
                {formData?.accounts.find(a => a.id === Number(accountIdIncome))?.name}
              </span>
            </div>
          )}
          {tab === 'transfer' && (
            <>
              <div className="flex justify-between items-center bg-background p-2 rounded-md">
                <span className="text-muted-foreground">Origem:</span>
                <span className="font-medium">
                  {formData?.accounts.find(a => a.id === Number(accountIdTransferOrigin))?.name}
                </span>
              </div>
              <div className="flex justify-between items-center bg-background p-2 rounded-md">
                <span className="text-muted-foreground">Destino:</span>
                <span className="font-medium">
                  {formData?.accounts.find(a => a.id === Number(accountIdTransferDest))?.name}
                </span>
              </div>
            </>
          )}
          {stepsList.includes(6) && (
            <div className="flex justify-between items-center bg-background p-2 rounded-md">
              <span className="text-muted-foreground">Situação:</span>
              <span className={`font-medium ${isPaid ? 'text-emerald-500' : 'text-orange-500'}`}>
                {isPaid ? (tab === 'expense' ? 'Pago' : 'Recebido') : 'Pendente'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) resetState();
    }}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button className="cursor-pointer fixed bottom-20 md:bottom-8 right-4 md:right-8 rounded-full h-14 w-14 shadow-2xl p-0 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all hover:scale-110 active:scale-95 z-[100] border-none flex items-center justify-center">
            <Plus className="h-7 w-7 text-white pointer-events-none" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[95dvh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
          <DialogDescription className="sr-only">
            Preencha os detalhes para registrar uma nova transação financeira.
          </DialogDescription>
        </DialogHeader>

        {open && formData ? (
          <div className="w-full">
            <Tabs
              value={tab}
              onValueChange={(val) => {
                setTab(val);
                resetState();
              }}
              className="w-full mb-4"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="expense" disabled={step > 1}>Despesa</TabsTrigger>
                <TabsTrigger value="income" disabled={step > 1}>Receita</TabsTrigger>
                <TabsTrigger value="transfer" disabled={step > 1}>Transferência</TabsTrigger>
              </TabsList>
            </Tabs>

            {renderStepIndicator()}

            <div className="min-h-[200px] sm:min-h-[280px] flex flex-col justify-center">
              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h2 className="text-xl font-medium text-center mb-6">Qual o valor e a data?</h2>
                  <div className="grid gap-3">
                    <Label className="text-muted-foreground ml-1">Valor</Label>
                    <CurrencyInput name="amount" value={amount} onValueChange={setAmount} className="h-14 text-2xl text-center font-semibold" autoFocus />
                  </div>
                  <div className="grid gap-3">
                    <Label className="text-muted-foreground ml-1">Data</Label>
                    <DatePicker id="date" name="date" value={transactionDate} onChange={setTransactionDate} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h2 className="text-xl font-medium text-center mb-6">Como deseja chamar?</h2>
                  <div className="grid gap-3">
                    <Label className="text-muted-foreground ml-1">Descrição</Label>
                    <Input
                      name="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Mercado, Salário..."
                      className="h-14 text-lg text-center"
                      autoFocus
                    />
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
                        <QuickCategoryDialog type={tab === "income" ? "income" : "expense"} onSuccess={handleCategoryCreated} />
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <Label className="text-muted-foreground ml-1">Subcategoria</Label>
                      <div className="flex gap-2">
                        <Select value={selectedSubcategoryId} onValueChange={setSelectedSubcategoryId} disabled={!selectedCategoryId}>
                          <SelectTrigger className="flex h-14 w-full rounded-xl border-transparent bg-muted/40 px-4 text-lg hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10 disabled:opacity-50">
                            <SelectValue placeholder={activeSubcategories.length === 0 ? "Nenhuma subcategoria" : "Selecione..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {activeSubcategories.map((sc: Subcategory) => (
                              <SelectItem key={sc.id} value={String(sc.id)}>{sc.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <QuickCategoryDialog
                          type={tab === "income" ? "income" : "expense"}
                          onSuccess={(catId, subCatId) => { handleCategoryCreated(catId, subCatId); setSelectedSubcategoryId(subCatId); }}
                          isSubcategoryMode={true}
                          parentCategoryId={selectedCategoryId}
                          parentCategoryName={filteredCategories.find(c => String(c.id) === selectedCategoryId)?.name}
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
                          <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
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
                          <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h2 className="text-xl font-medium text-center mb-6">Qual a recorrência?</h2>
                  <div className="flex gap-4 p-4 rounded-xl bg-muted/20 border justify-center">
                    <label className="flex flex-col items-center gap-2 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors flex-1">
                      <input type="radio" checked={expenseType === "single"} onChange={() => setExpenseType("single")} className="w-5 h-5 accent-primary" />
                      <span className="font-medium text-sm">Única</span>
                    </label>
                    <label className="flex flex-col items-center gap-2 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors flex-1">
                      <input type="radio" checked={expenseType === "fixed"} onChange={() => setExpenseType("fixed")} className="w-5 h-5 accent-primary" />
                      <span className="font-medium text-sm">Fixa</span>
                    </label>
                    <label className="flex flex-col items-center gap-2 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors flex-1">
                      <input type="radio" checked={expenseType === "installment"} onChange={() => setExpenseType("installment")} className="w-5 h-5 accent-primary" />
                      <span className="font-medium text-sm">Parcelada</span>
                    </label>
                  </div>

                  {expenseType === "installment" && (
                    <div className="space-y-5 animate-in slide-in-from-bottom-2">
                      <div className="grid grid-cols-2 gap-5">
                        <div className="grid gap-3">
                          <Label className="text-muted-foreground ml-1">Parcela Atual/Inicial</Label>
                          <Input type="number" min="1" value={currentInstallment} onChange={e => setCurrentInstallment(e.target.value)} className="h-12 text-center text-lg" />
                        </div>
                        <div className="grid gap-3">
                          <Label className="text-muted-foreground ml-1">Total de Parcelas</Label>
                          <Input type="number" min="2" value={installmentTotal} onChange={e => setInstallmentTotal(e.target.value)} className="h-12 text-center text-lg" />
                        </div>
                      </div>
                      <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background">
                        <div className="space-y-0.5">
                          <Label className="text-base cursor-pointer" onClick={() => setIsTotalAmount(!isTotalAmount)}>
                            O valor é o total da compra?
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Ativo: Divide o valor pelas parcelas. Inativo: O valor é de cada parcela.
                          </p>
                        </div>
                        <Switch checked={isTotalAmount} onCheckedChange={setIsTotalAmount} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 5 && tab === "expense" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h2 className="text-xl font-medium text-center mb-6">Como isso foi pago?</h2>
                  
                  <div className="flex gap-4 p-4 rounded-xl bg-muted/20 border justify-center">
                    <label className="flex flex-col items-center gap-2 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors flex-1">
                      <input type="radio" checked={paymentMethod === "account"} onChange={() => setPaymentMethod("account")} className="w-5 h-5 accent-primary" />
                      <span className="font-medium">Conta</span>
                    </label>
                    <label className="flex flex-col items-center gap-2 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors flex-1">
                      <input type="radio" checked={paymentMethod === "credit_card"} onChange={() => setPaymentMethod("credit_card")} className="w-5 h-5 accent-primary" />
                      <span className="font-medium">Cartão de Crédito</span>
                    </label>
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
                            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {paymentMethod === "credit_card" && (
                    <div className="space-y-5 animate-in fade-in">
                      <div className="grid gap-3">
                        <Label className="text-muted-foreground ml-1">Cartão de Crédito</Label>
                        <Select value={selectedCreditCardId} onValueChange={handleCreditCardChange}>
                          <SelectTrigger className="h-14 w-full rounded-xl text-lg">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {formData.creditCards.map((c: CreditCard) => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedCreditCardId && invoiceOptions.length > 0 && (
                        <div className="grid gap-3">
                          <Label className="text-muted-foreground ml-1">Fatura</Label>
                          <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-muted/20 border max-h-48 overflow-y-auto">
                            {invoiceOptions.map((opt) => (
                              <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap bg-background p-2 rounded-lg border flex-1 justify-center hover:border-primary transition-all">
                                <input type="radio" value={opt.value} checked={selectedInvoiceMonth === opt.value} onChange={() => setSelectedInvoiceMonth(opt.value)} className="accent-primary" /> 
                                <span className="font-medium">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step === 5 && tab === "income" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h2 className="text-xl font-medium text-center mb-6">Onde vai entrar esse dinheiro?</h2>
                  <div className="grid gap-3">
                    <Label className="text-muted-foreground ml-1">Depositar na Conta</Label>
                    <Select value={accountIdIncome} onValueChange={setAccountIdIncome}>
                      <SelectTrigger className="h-14 w-full rounded-xl text-lg bg-muted/40">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.accounts.map((a: Account) => (
                          <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <h2 className="text-xl font-medium text-center mb-6">Qual a situação atual?</h2>
                  <div className="flex flex-col items-center justify-center p-8 rounded-xl border bg-muted/20 gap-6">
                    <Label className="text-xl text-center cursor-pointer" onClick={() => setIsPaid(!isPaid)}>
                      {tab === "expense" ? "Essa despesa já foi paga?" : "Essa receita já foi recebida?"}
                    </Label>
                    <Switch checked={isPaid} onCheckedChange={setIsPaid} className="scale-150" />
                    <p className="text-muted-foreground text-center max-w-sm mt-4">
                      {isPaid 
                        ? (tab === "expense" ? "Marcado como Pago. O valor será deduzido do saldo." : "Marcado como Recebido. O valor será adicionado ao saldo.")
                        : "Marcado como Pendente. Não afetará o saldo atual da conta ainda."}
                    </p>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  {renderSummary()}
                  {formError && <p className="text-sm text-destructive text-center">{formError}</p>}
                </div>
              )}
            </div>

            <div className="pt-4 sm:pt-8 flex flex-wrap justify-between gap-2 sm:gap-3 mt-3 sm:mt-4 border-t">
              <Button type="button" variant="outline" onClick={handlePrevStep} disabled={isFirstStep || isPending} className="min-w-[100px] sm:w-32">
                <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" /> Voltar
              </Button>
              
              {!isLastStep ? (
                <Button type="button" onClick={handleNextStep} className="min-w-[100px] sm:w-32 bg-primary">
                  Próximo <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button type="button" variant="secondary" onClick={() => handleSubmit("save-and-continue")} disabled={isPending} className="text-xs sm:text-sm px-2 sm:px-4">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 sm:mr-2 h-4 w-4" /> Adicionar Outra</>}
                  </Button>
                  <Button type="button" onClick={() => handleSubmit("save-and-close")} disabled={isPending} className="bg-gradient-to-r from-violet-600 to-indigo-600 border-none text-xs sm:text-sm px-2 sm:px-4">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <><Check className="mr-1 sm:mr-2 h-4 w-4" /> Finalizar</>}
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
