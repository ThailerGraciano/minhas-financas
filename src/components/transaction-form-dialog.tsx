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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { transactions } from "@/db/schema";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Loader2 } from "lucide-react";
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
  const [expenseType, setExpenseType] = useState("single");
  const [paymentMethod, setPaymentMethod] = useState("account");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [selectedCreditCardId, setSelectedCreditCardId] = useState("");
  const [selectedInvoiceMonth, setSelectedInvoiceMonth] = useState("");
  const [isTotalAmount, setIsTotalAmount] = useState(true);
  const [formKey, setFormKey] = useState(0);
  
  const [transactionDate, setTransactionDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [isPaid, setIsPaid] = useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isPastOrToday = transactionDate <= todayStr;

  const router = useRouter();

  useEffect(() => {
    if (open && !formData) {
      getTransactionFormData().then(setFormData);
    }
  }, [open, formData]);

  // Calcula o mês da fatura padrão com base no closing_day do cartão
  const getDefaultInvoiceMonth = (closingDay: number): string => {
    const today = new Date();
    // Se hoje é maior ou igual ao dia de fechamento, a fatura atual está fechada
    // e a compra cai na fatura do próximo mês
    if (today.getDate() >= closingDay) {
      const next = addMonths(today, 1);
      return format(next, "yyyy-MM");
    }
    return format(today, "yyyy-MM");
  };

  // Gera opções de fatura: mês atual do cartão + 6 meses futuros
  const invoiceOptions = useMemo(() => {
    if (!selectedCreditCardId || !formData?.creditCards) return [];
    const card = formData.creditCards.find((c: CreditCard) => c.id === Number(selectedCreditCardId));
    if (!card) return [];

    const defaultMonth = getDefaultInvoiceMonth(card.closingDay);
    const [year, month] = defaultMonth.split("-").map(Number);
    const baseDate = new Date(year, month - 1, 1);

    const options: { value: string; label: string }[] = [];
    for (let i = -3; i < 7; i++) {
      const d = addMonths(baseDate, i);
      const value = format(d, "yyyy-MM");
      const label = format(d, "MMMM/yyyy", { locale: ptBR });
      // Capitaliza a primeira letra do mês
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      options.push({ value, label: capitalizedLabel });
    }
    return options;
  }, [selectedCreditCardId, formData?.creditCards]);

  const handleCreditCardChange = (value: string) => {
    setSelectedCreditCardId(value);
    if (!value || !formData?.creditCards) {
      setSelectedInvoiceMonth("");
      return;
    }
    const card = formData.creditCards.find((c: CreditCard) => c.id === Number(value));
    if (card) {
      setSelectedInvoiceMonth(getDefaultInvoiceMonth(card.closingDay));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setFormError("");

    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
    const action = submitter?.value || "save-and-close";

    const form = new FormData(e.currentTarget);
    const description = form.get("description") as string;
    const amount = form.get("amount") as string;
    const date = form.get("date") as string;
    const categoryId = form.get("categoryId") as string;

    // Extrai YYYY-MM (para transações que não são cartão de crédito)
    const competencyMonth = date.substring(0, 7);

    const baseData: Partial<NewTransaction> & Record<string, unknown> = {
      description,
      amount,
      date,
      competencyMonth,
      categoryId: Number(categoryId),
      subcategoryId: selectedSubcategoryId ? Number(selectedSubcategoryId) : null,
      status: isPaid && isPastOrToday ? "paid" : "pending",
    };

    if (tab === "expense") {
      const isCreditCard = paymentMethod === "credit_card";
      baseData.type = isCreditCard ? "credit_card_expense" : "expense";

      if (isCreditCard) {
        baseData.creditCardId = Number(selectedCreditCardId);
        // Usa a competência da fatura selecionada
        if (selectedInvoiceMonth) {
          baseData.competencyMonth = selectedInvoiceMonth;

          const card = formData?.creditCards.find((c: CreditCard) => c.id === Number(selectedCreditCardId));
          if (card) {
            const [year, month] = selectedInvoiceMonth.split("-").map(Number);
            const closingDate = new Date(year, month - 1, card.closingDay);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (today >= closingDate) {
              if (!window.confirm("Esta fatura já está fechada. Deseja realmente incluir uma despesa nela?")) {
                setIsPending(false);
                return;
              }
            }
          }
        }
      } else {
        baseData.accountId = Number(form.get("accountId"));
      }

      baseData.isFixed = expenseType === "fixed";

      if (expenseType === "installment") {
        baseData.installmentTotal = Number(form.get("installmentTotal"));
        baseData.current_installment = Number(form.get("current_installment"));
        baseData.isTotalAmount = isTotalAmount;
      }
    } else if (tab === "income") {
      baseData.type = "income";
      baseData.accountId = Number(form.get("accountIdIncome"));

      baseData.isFixed = expenseType === "fixed";

      if (expenseType === "installment") {
        baseData.installmentTotal = Number(form.get("installmentTotal"));
        baseData.current_installment = Number(form.get("current_installment"));
        baseData.isTotalAmount = isTotalAmount;
      }
    } else if (tab === "transfer") {
      baseData.type = "transfer";
      baseData.accountId = Number(form.get("accountIdTransferOrigin"));
      baseData.destinationAccountId = Number(form.get("accountIdTransferDest"));

      baseData.isFixed = expenseType === "fixed";

      if (expenseType === "installment") {
        baseData.installmentTotal = Number(form.get("installmentTotal"));
        baseData.current_installment = Number(form.get("current_installment"));
        baseData.isTotalAmount = isTotalAmount;
      }
    }

    const res = await createTransaction(baseData as NewTransaction);

    setIsPending(false);
    if (res.success) {
      toast.success("Transação salva com sucesso!");
      if (action === "save-and-continue") {
        setTab("expense");
        setExpenseType("single");
        setPaymentMethod("account");
        setSelectedCategoryId("");
        setSelectedSubcategoryId("");
        setSelectedCreditCardId("");
        setSelectedInvoiceMonth("");
        setIsTotalAmount(true);
        setIsPaid(false);
        setTransactionDate(format(new Date(), "yyyy-MM-dd"));
        setFormKey(prev => prev + 1);
      } else {
        setOpen(false);
      }
      if (onSuccess) onSuccess();
      router.refresh();
    } else {
      toast.error(res.error || "Erro ao salvar a transação.");
      setFormError(res.error || "Erro ao salvar a transação.");
    }
  };

  const handleCategoryCreated = async (newCategoryId: string, newSubcategoryId: string) => {
    // Re-fetch the form data so the new category is available in the selects
    const data = await getTransactionFormData();
    setFormData(data);
    setSelectedCategoryId(newCategoryId);

    if (newSubcategoryId) {
      setSelectedSubcategoryId(newSubcategoryId);
    } else {
      // Find "Geral" subcategory for this category to select it
      const cat = data.categories.find((c) => c.id === Number(newCategoryId));
      const geralSub = cat?.subcategories.find((sc) => sc.name === "Geral");
      if (geralSub) {
        setSelectedSubcategoryId(String(geralSub.id));
      } else {
        setSelectedSubcategoryId("");
      }
    }
  };

  // Filter categories based on active tab
  const filteredCategories = useMemo(() => {
    if (!formData?.categories) return [];
    const targetType = tab === "income" ? "income" : "expense"; // 'transfer' can use expense categories for now or have its own logic
    return formData.categories.filter((c: Category) => c.type === targetType);
  }, [formData, tab]);

  // Find subcategories for selected category
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button className="cursor-pointer fixed bottom-20 md:bottom-8 right-4 md:right-8 rounded-full h-14 w-14 shadow-2xl p-0 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all hover:scale-110 active:scale-95 z-[100] border-none flex items-center justify-center">
            <Plus className="h-7 w-7 text-white pointer-events-none" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
          <DialogDescription className="sr-only">
            Preencha os detalhes para registrar uma nova transação financeira.
          </DialogDescription>
        </DialogHeader>

        {open && formData ? (
          <Tabs
            value={tab}
            onValueChange={(val) => {
              setTab(val);
              setSelectedCategoryId("");
              setSelectedSubcategoryId("");
              setFormError("");
              setIsTotalAmount(false);
              setIsPaid(false);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="expense">Despesa</TabsTrigger>
              <TabsTrigger value="income">Receita</TabsTrigger>
              <TabsTrigger value="transfer">Transferência</TabsTrigger>
            </TabsList>

            <form key={formKey} onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div className="grid gap-3">
                <Label htmlFor="description" className="text-muted-foreground ml-1">
                  Descrição
                </Label>
                <Input
                  id="description"
                  name="description"
                  required
                  placeholder="Ex: Mercado, Salário..."
                  className="text-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="grid gap-3">
                  <Label htmlFor="amount" className="text-muted-foreground ml-1">
                    Valor
                  </Label>
                  <CurrencyInput id="amount" name="amount" required />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="date" className="text-muted-foreground ml-1">
                    Data
                  </Label>
                  <DatePicker 
                    id="date" 
                    name="date" 
                    value={transactionDate} 
                    onChange={setTransactionDate} 
                    required 
                  />
                </div>
              </div>

              {isPastOrToday && (tab === "expense" || tab === "income") && (
                <div className="flex flex-row items-center justify-between rounded-xl border p-4 bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-base cursor-pointer" onClick={() => setIsPaid(!isPaid)}>
                      {tab === "expense" ? "Despesa já foi paga?" : "Receita já foi recebida?"}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Marque se esta transação já foi efetivada.
                    </p>
                  </div>
                  <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-5">
                <div className="grid gap-3">
                  <Label htmlFor="categoryId" className="text-muted-foreground ml-1">
                    Categoria
                  </Label>
                  <input type="hidden" name="categoryId" value={selectedCategoryId} required />
                  <div className="flex gap-2">
                    <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="w-full h-12 rounded-xl border-transparent bg-muted/40 px-4 text-base hover:bg-muted/60 transition-all outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCategories.map((c: Category) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name={c.icon} className="h-4 w-4 text-muted-foreground" />
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
                  <Label htmlFor="subcategoryId" className="text-muted-foreground ml-1">
                    Subcategoria
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      name="subcategoryId"
                      value={selectedSubcategoryId}
                      onValueChange={setSelectedSubcategoryId}
                      disabled={!selectedCategoryId}
                      required={tab !== "transfer"}
                    >
                      <SelectTrigger className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10 disabled:opacity-50">
                        <SelectValue placeholder={activeSubcategories.length === 0 ? "Nenhuma subcategoria disponível" : "Selecione..."} />
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
                      parentCategoryName={filteredCategories.find(c => String(c.id) === selectedCategoryId)?.name}
                    />
                  </div>
                </div>
              </div>

              <TabsContent value="expense" className="space-y-6">
                <div className="grid gap-3">
                  <Label className="text-muted-foreground ml-1">Tipo de Despesa</Label>
                  <div className="flex gap-6 p-4 rounded-xl bg-muted/20 border border-border/50">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={expenseType === "single"}
                        onChange={() => setExpenseType("single")}
                        className="accent-primary"
                      />{" "}
                      Única
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={expenseType === "fixed"}
                        onChange={() => setExpenseType("fixed")}
                        className="accent-primary"
                      />{" "}
                      Fixa
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={expenseType === "installment"}
                        onChange={() => setExpenseType("installment")}
                        className="accent-primary"
                      />{" "}
                      Parcelada
                    </label>
                  </div>
                </div>

                {tab === "expense" && expenseType === "installment" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <div className="grid gap-3">
                        <Label htmlFor="current_installment" className="text-muted-foreground ml-1">
                          Parcela Atual/Inicial
                        </Label>
                        <Input
                          id="current_installment"
                          name="current_installment"
                          type="number"
                          min="1"
                          defaultValue="1"
                          required
                        />
                        <p className="text-xs text-muted-foreground ml-1">Ex: Para a parcela 5 de 48, digite 5.</p>
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="installmentTotal" className="text-muted-foreground ml-1">
                          Total de Parcelas
                        </Label>
                        <Input
                          id="installmentTotal"
                          name="installmentTotal"
                          type="number"
                          min="2"
                          defaultValue="2"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base cursor-pointer" onClick={() => setIsTotalAmount(!isTotalAmount)}>
                          O valor digitado é o total da compra?
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Se marcado, o valor será dividido pelo número de parcelas. Se desmarcado, o valor será o de
                          cada parcela individual.
                        </p>
                      </div>
                      <Switch checked={isTotalAmount} onCheckedChange={setIsTotalAmount} />
                    </div>
                  </div>
                )}

                <div className="grid gap-3">
                  <Label className="text-muted-foreground ml-1">Método de Pagamento</Label>
                  <Select
                    name="paymentMethod"
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="account">Conta</SelectItem>
                      <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === "account" && (
                  <div className="grid gap-3">
                    <Label htmlFor="accountId" className="text-muted-foreground ml-1">
                      Conta
                    </Label>
                    <Select name="accountId" required>
                      <SelectTrigger className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10">
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
                  <>
                    <div className="grid gap-3">
                      <Label htmlFor="creditCardId" className="text-muted-foreground ml-1">
                        Cartão de Crédito
                      </Label>
                      <Select
                        name="creditCardId"
                        value={selectedCreditCardId}
                        onValueChange={handleCreditCardChange}
                        required
                      >
                        <SelectTrigger className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.creditCards.map((c: CreditCard) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedCreditCardId && invoiceOptions.length > 0 && (
                      <div className="grid gap-3">
                        <Label htmlFor="invoiceMonth" className="text-muted-foreground ml-1">
                          Fatura
                        </Label>
                        <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-muted/20 border border-border/50 max-h-48 overflow-y-auto">
                          {invoiceOptions.map((opt) => (
                            <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="radio"
                                name="invoiceMonth"
                                value={opt.value}
                                checked={selectedInvoiceMonth === opt.value}
                                onChange={() => setSelectedInvoiceMonth(opt.value)}
                                className="accent-primary"
                                required
                              />{" "}
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="income" className="space-y-6">
                <div className="grid gap-3">
                  <Label htmlFor="accountIdIncome" className="text-muted-foreground ml-1">
                    Depositar na Conta
                  </Label>
                  <Select name="accountIdIncome" required>
                    <SelectTrigger className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10">
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
                  <Label className="text-muted-foreground ml-1">Tipo de Receita</Label>
                  <div className="flex gap-6 p-4 rounded-xl bg-muted/20 border border-border/50">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={expenseType === "single"}
                        onChange={() => setExpenseType("single")}
                        className="accent-primary"
                      />{" "}
                      Única
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={expenseType === "fixed"}
                        onChange={() => setExpenseType("fixed")}
                        className="accent-primary"
                      />{" "}
                      Fixa
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={expenseType === "installment"}
                        onChange={() => setExpenseType("installment")}
                        className="accent-primary"
                      />{" "}
                      Parcelada
                    </label>
                  </div>
                </div>

                {tab === "income" && expenseType === "installment" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <div className="grid gap-3">
                        <Label htmlFor="current_installment" className="text-muted-foreground ml-1">
                          Parcela Atual/Inicial
                        </Label>
                        <Input
                          id="current_installment"
                          name="current_installment"
                          type="number"
                          min="1"
                          defaultValue="1"
                          required
                        />
                        <p className="text-xs text-muted-foreground ml-1">Ex: Para a parcela 5 de 48, digite 5.</p>
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="installmentTotal" className="text-muted-foreground ml-1">
                          Total de Parcelas
                        </Label>
                        <Input
                          id="installmentTotal"
                          name="installmentTotal"
                          type="number"
                          min="2"
                          defaultValue="2"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base cursor-pointer" onClick={() => setIsTotalAmount(!isTotalAmount)}>
                          O valor digitado é o total da compra?
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Se marcado, o valor será dividido pelo número de parcelas. Se desmarcado, o valor será o de
                          cada parcela individual.
                        </p>
                      </div>
                      <Switch checked={isTotalAmount} onCheckedChange={setIsTotalAmount} />
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="transfer" className="space-y-6">
                <div className="grid gap-3">
                  <Label className="text-muted-foreground ml-1">Tipo de Transferência</Label>
                  <div className="flex gap-6 p-4 rounded-xl bg-muted/20 border border-border/50">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={expenseType === "single"}
                        onChange={() => setExpenseType("single")}
                        className="accent-primary"
                      />{" "}
                      Única
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={expenseType === "fixed"}
                        onChange={() => setExpenseType("fixed")}
                        className="accent-primary"
                      />{" "}
                      Fixa
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={expenseType === "installment"}
                        onChange={() => setExpenseType("installment")}
                        className="accent-primary"
                      />{" "}
                      Parcelada
                    </label>
                  </div>
                </div>

                {tab === "transfer" && expenseType === "installment" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <div className="grid gap-3">
                        <Label htmlFor="current_installment" className="text-muted-foreground ml-1">
                          Parcela Atual/Inicial
                        </Label>
                        <Input
                          id="current_installment"
                          name="current_installment"
                          type="number"
                          min="1"
                          defaultValue="1"
                          required
                        />
                        <p className="text-xs text-muted-foreground ml-1">Ex: Para a parcela 5 de 48, digite 5.</p>
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="installmentTotal" className="text-muted-foreground ml-1">
                          Total de Parcelas
                        </Label>
                        <Input
                          id="installmentTotal"
                          name="installmentTotal"
                          type="number"
                          min="2"
                          defaultValue="2"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base cursor-pointer" onClick={() => setIsTotalAmount(!isTotalAmount)}>
                          O valor digitado é o total da compra?
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Se marcado, o valor será dividido pelo número de parcelas. Se desmarcado, o valor será o de
                          cada parcela individual.
                        </p>
                      </div>
                      <Switch checked={isTotalAmount} onCheckedChange={setIsTotalAmount} />
                    </div>
                  </div>
                )}

                <div className="grid gap-3">
                  <Label className="text-muted-foreground ml-1">Tipo de Transferência</Label>
                  <div className="flex gap-6 p-4 rounded-xl bg-muted/20 border border-border/50">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={expenseType === "single"}
                        onChange={() => setExpenseType("single")}
                        className="accent-primary"
                      />{" "}
                      Única
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={expenseType === "fixed"}
                        onChange={() => setExpenseType("fixed")}
                        className="accent-primary"
                      />{" "}
                      Fixa
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={expenseType === "installment"}
                        onChange={() => setExpenseType("installment")}
                        className="accent-primary"
                      />{" "}
                      Parcelada
                    </label>
                  </div>
                </div>

                {tab === "transfer" && expenseType === "installment" && (
                  <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-3">
                        <Label htmlFor="current_installment" className="text-muted-foreground ml-1">
                          Parcela Atual
                        </Label>
                        <Input
                          id="current_installment"
                          name="current_installment"
                          type="number"
                          min="1"
                          defaultValue="1"
                          required
                        />
                        <p className="text-xs text-muted-foreground ml-1">Ex: Para a parcela 5 de 48, digite 5.</p>
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="installmentTotal" className="text-muted-foreground ml-1">
                          Total de Parcelas
                        </Label>
                        <Input
                          id="installmentTotal"
                          name="installmentTotal"
                          type="number"
                          min="2"
                          defaultValue="2"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base cursor-pointer" onClick={() => setIsTotalAmount(!isTotalAmount)}>
                          O valor digitado é o total a ser transferido?
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Se marcado, o valor será dividido pelo número de parcelas. Se desmarcado, o valor será o de
                          cada parcela individual.
                        </p>
                      </div>
                      <Switch checked={isTotalAmount} onCheckedChange={setIsTotalAmount} />
                    </div>
                  </div>
                )}

                <div className="grid gap-3">
                  <Label htmlFor="accountIdTransferOrigin" className="text-muted-foreground ml-1">
                    Conta de Origem
                  </Label>
                  <Select name="accountIdTransferOrigin" required>
                    <SelectTrigger className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10">
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
                  <Label htmlFor="accountIdTransferDest" className="text-muted-foreground ml-1">
                    Conta de Destino
                  </Label>
                  <Select name="accountIdTransferDest" required>
                    <SelectTrigger className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10">
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
              </TabsContent>

              {formError && <p className="text-sm text-destructive text-center">{formError}</p>}

              <div className="pt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button type="submit" name="action" value="save-and-continue" disabled={isPending} variant="outline" className="w-full sm:w-auto mt-2">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isPending ? "Salvando..." : "Salvar e Continuar"}
                </Button>
                <Button type="submit" name="action" value="save-and-close" disabled={isPending} className="w-full sm:w-auto mt-2">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isPending ? "Salvando..." : "Salvar Transação"}
                </Button>
              </div>
            </form>
          </Tabs>
        ) : open ? (
          <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            Carregando formulário...
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
