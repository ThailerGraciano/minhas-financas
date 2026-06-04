"use client";

import { getTransactionFormData } from "@/app/actions/form-data";
import { createTransaction } from "@/app/actions/transactions";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export function TransactionFormDialog() {
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

  // Auto-selecionar a fatura padrão quando o cartão muda
  useEffect(() => {
    if (!selectedCreditCardId || !formData?.creditCards) {
      setSelectedInvoiceMonth("");
      return;
    }
    const card = formData.creditCards.find((c: CreditCard) => c.id === Number(selectedCreditCardId));
    if (card) {
      setSelectedInvoiceMonth(getDefaultInvoiceMonth(card.closingDay));
    }
  }, [selectedCreditCardId, formData?.creditCards]);


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
      }
    } else if (tab === "income") {
      baseData.type = "income";
      baseData.accountId = Number(form.get("accountIdIncome"));
    } else if (tab === "transfer") {
      baseData.type = "transfer";
      baseData.accountId = Number(form.get("accountIdTransferOrigin"));
      // Transferências reais precisam de lógica dupla, mas manteremos simples por enquanto
    }

    const res = await createTransaction(baseData as NewTransaction);

    setIsPending(false);
    if (res.success) {
      setOpen(false);
      router.refresh();
    } else {
      setFormError(res.error || "Erro ao salvar a transação.");
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

  // Auto-selecionar a primeira subcategoria ao mudar de categoria
  useEffect(() => {
    if (activeSubcategories.length > 0) {
      setSelectedSubcategoryId(String(activeSubcategories[0].id));
    } else {
      setSelectedSubcategoryId("");
    }
  }, [activeSubcategories]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer fixed bottom-20 md:bottom-8 right-4 md:right-8 rounded-full h-14 w-14 shadow-2xl p-0 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all hover:scale-110 active:scale-95 z-[100] border-none flex items-center justify-center">
          <Plus className="h-7 w-7 text-white pointer-events-none" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
          <DialogDescription className="sr-only">
            Preencha os detalhes para registrar uma nova transação financeira.
          </DialogDescription>
        </DialogHeader>

        {formData ? (
          <Tabs
            value={tab}
            onValueChange={(val) => {
              setTab(val);
              setSelectedCategoryId("");
              setSelectedSubcategoryId("");
              setFormError("");
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="expense">Despesa</TabsTrigger>
              <TabsTrigger value="income">Receita</TabsTrigger>
              <TabsTrigger value="transfer">Transferência</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Input id="description" name="description" required placeholder="Ex: Mercado, Salário..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Valor</Label>
                  <CurrencyInput id="amount" name="amount" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Data</Label>
                  <Input id="date" name="date" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="categoryId">Categoria</Label>
                  <input type="hidden" name="categoryId" value={selectedCategoryId} required />
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger className="w-full h-10 bg-background text-sm flex items-center justify-between">
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
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subcategoryId">Subcategoria</Label>
                  <select
                    name="subcategoryId"
                    value={selectedSubcategoryId}
                    onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                    disabled={!selectedCategoryId || activeSubcategories.length === 0}
                    required={tab !== "transfer"}
                  >
                    {activeSubcategories.length === 0 && (
                      <option value="">Selecione uma categoria primeiro</option>
                    )}
                    {activeSubcategories.map((sc: Subcategory) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <TabsContent value="expense" className="space-y-4">
                <div className="grid gap-2">
                  <Label>Tipo de Despesa</Label>
                  <div className="flex gap-4">
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

                {expenseType === "installment" && (
                  <div className="grid gap-2">
                    <Label htmlFor="installmentTotal">Quantidade de Parcelas</Label>
                    <Input
                      id="installmentTotal"
                      name="installmentTotal"
                      type="number"
                      min="2"
                      defaultValue="2"
                      required
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Método de Pagamento</Label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="account">Conta</option>
                    <option value="credit_card">Cartão de Crédito</option>
                  </select>
                </div>

                {paymentMethod === "account" && (
                  <div className="grid gap-2">
                    <Label htmlFor="accountId">Conta</Label>
                    <select
                      name="accountId"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                    <div className="grid gap-2">
                      <Label htmlFor="creditCardId">Cartão de Crédito</Label>
                      <select
                        name="creditCardId"
                        value={selectedCreditCardId}
                        onChange={(e) => setSelectedCreditCardId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                      <div className="grid gap-2">
                        <Label htmlFor="invoiceMonth">Fatura</Label>
                        <select
                          name="invoiceMonth"
                          value={selectedInvoiceMonth}
                          onChange={(e) => setSelectedInvoiceMonth(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

              <TabsContent value="income" className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="accountIdIncome">Depositar na Conta</Label>
                  <select
                    name="accountIdIncome"
                    id="accountIdIncome"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

              <TabsContent value="transfer" className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="accountIdTransferOrigin">Conta de Origem</Label>
                  <select
                    name="accountIdTransferOrigin"
                    id="accountIdTransferOrigin"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    {formData.accounts.map((a: Account) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accountIdTransferDest">Conta de Destino</Label>
                  <select
                    name="accountIdTransferDest"
                    id="accountIdTransferDest"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

              {formError && (
                <p className="text-sm text-destructive text-center">{formError}</p>
              )}

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                  {isPending ? "Salvando..." : "Salvar Transação"}
                </Button>
              </div>
            </form>
          </Tabs>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            Carregando formulário...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
