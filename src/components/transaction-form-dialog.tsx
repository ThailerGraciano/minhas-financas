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
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

  const router = useRouter();

  useEffect(() => {
    if (open && !formData) {
      getTransactionFormData().then(setFormData);
    }
  }, [open, formData]);

  // Calcula o mês da fatura padrão com base no closing_day do cartão
  const getDefaultInvoiceMonth = (closingDay: number): string => {
    const today = new Date();
    // Se hoje é ANTES ou NO dia de fechamento, a compra cai na fatura do mês atual
    // Se hoje é DEPOIS do fechamento, cai na fatura do próximo mês
    if (today.getDate() > closingDay) {
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
    for (let i = 0; i < 7; i++) {
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
      status: "pending",
    };

    if (tab === "expense") {
      const isCreditCard = paymentMethod === "credit_card";
      baseData.type = isCreditCard ? "credit_card_expense" : "expense";

      if (isCreditCard) {
        baseData.creditCardId = Number(selectedCreditCardId);
        // Usa a competência da fatura selecionada
        if (selectedInvoiceMonth) {
          baseData.competencyMonth = selectedInvoiceMonth;
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
    }

    const res = await createTransaction(baseData as NewTransaction);

    setIsPending(false);
    if (res.success) {
      setOpen(false);
      if (onSuccess) onSuccess();
      router.refresh();
    } else {
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
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="expense">Despesa</TabsTrigger>
              <TabsTrigger value="income">Receita</TabsTrigger>
              <TabsTrigger value="transfer">Transferência</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
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
                  <DatePicker id="date" name="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
                </div>
              </div>

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
                    <QuickCategoryDialog type={tab === "income" ? "income" : "expense"} onSuccess={handleCategoryCreated} />
                  </div>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="subcategoryId" className="text-muted-foreground ml-1">Subcategoria</Label>
                  <div className="flex gap-2">
                    <select
                      name="subcategoryId"
                      value={selectedSubcategoryId}
                      onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                      className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10 disabled:opacity-50"
                      disabled={!selectedCategoryId}
                      required={tab !== "transfer"}
                    >
                      {activeSubcategories.length === 0 && <option value="">Nenhuma subcategoria disponível</option>}
                      {activeSubcategories.map((sc: Subcategory) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
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
                        <p className="text-xs text-muted-foreground ml-1">
                          Ex: Para a parcela 5 de 48, digite 5.
                        </p>
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
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10"
                  >
                    <option value="account">Conta</option>
                    <option value="credit_card">Cartão de Crédito</option>
                  </select>
                </div>

                {paymentMethod === "account" && (
                  <div className="grid gap-3">
                    <Label htmlFor="accountId" className="text-muted-foreground ml-1">
                      Conta
                    </Label>
                    <select
                      name="accountId"
                      className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10"
                      required
                    >
                      {formData.accounts.map((a: Account) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {paymentMethod === "credit_card" && (
                  <>
                    <div className="grid gap-3">
                      <Label htmlFor="creditCardId" className="text-muted-foreground ml-1">
                        Cartão de Crédito
                      </Label>
                      <select
                        name="creditCardId"
                        value={selectedCreditCardId}
                        onChange={(e) => handleCreditCardChange(e.target.value)}
                        className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10"
                        required
                      >
                        <option value="">Selecione...</option>
                        {formData.creditCards.map((c: CreditCard) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedCreditCardId && invoiceOptions.length > 0 && (
                      <div className="grid gap-3">
                        <Label htmlFor="invoiceMonth" className="text-muted-foreground ml-1">
                          Fatura
                        </Label>
                        <select
                          name="invoiceMonth"
                          value={selectedInvoiceMonth}
                          onChange={(e) => setSelectedInvoiceMonth(e.target.value)}
                          className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10"
                          required
                        >
                          {invoiceOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
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
                  <select
                    name="accountIdIncome"
                    id="accountIdIncome"
                    className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10"
                    required
                  >
                    {formData.accounts.map((a: Account) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
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
                        <p className="text-xs text-muted-foreground ml-1">
                          Ex: Para a parcela 5 de 48, digite 5.
                        </p>
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
                  <Label htmlFor="accountIdTransferOrigin" className="text-muted-foreground ml-1">
                    Conta de Origem
                  </Label>
                  <select
                    name="accountIdTransferOrigin"
                    id="accountIdTransferOrigin"
                    className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10"
                    required
                  >
                    {formData.accounts.map((a: Account) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="accountIdTransferDest" className="text-muted-foreground ml-1">
                    Conta de Destino
                  </Label>
                  <select
                    name="accountIdTransferDest"
                    id="accountIdTransferDest"
                    className="flex h-12 w-full rounded-xl border border-transparent bg-muted/40 px-4 py-2 text-base hover:bg-muted/60 transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10"
                    required
                  >
                    {formData.accounts.map((a: Account) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </TabsContent>

              {formError && <p className="text-sm text-destructive text-center">{formError}</p>}

              <div className="pt-6 flex justify-end">
                <Button type="submit" disabled={isPending} className="w-full sm:w-auto mt-2">
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
