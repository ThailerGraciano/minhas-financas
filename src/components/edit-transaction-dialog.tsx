'use client';

import { getTransactionFormData } from "@/app/actions/form-data";
import { updateTransaction, getTransactionDetailsForEdit } from "@/app/actions/transactions";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

type FormData = NonNullable<Awaited<ReturnType<typeof getTransactionFormData>>>;
type Category = FormData["categories"][0];
type Subcategory = Category["subcategories"][0];
type CreditCard = FormData["creditCards"][0];

interface TransactionProp {
  id: number | string;
  type: string;
  description: string;
  amount: number | string;
  date: string;
  categoryId?: number | string | null;
  subcategoryId?: number | string | null;
  accountId?: number | string | null;
  creditCardId?: number | string | null;
  destinationAccountId?: number | string | null;
  competencyMonth?: string;
  fixedTransactionId?: string | null;
  installmentTotal?: number | null;
  installmentCurrent?: number | null;
}

interface EditTransactionDialogProps {
  transaction: TransactionProp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTransactionDialog({ transaction, open, onOpenChange }: EditTransactionDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [formError, setFormError] = useState("");

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [originalAmount, setOriginalAmount] = useState<number>(0);
  const [updateFuture, setUpdateFuture] = useState(false);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedDestinationAccountId, setSelectedDestinationAccountId] = useState("");
  const [selectedInvoiceMonth, setSelectedInvoiceMonth] = useState("");
  const [fullTransaction, setFullTransaction] = useState<TransactionProp | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (open && !formData) {
      getTransactionFormData().then(setFormData);
    }
  }, [open, formData]);

  useEffect(() => {
    if (open && transaction) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCategoryId(transaction.categoryId ? String(transaction.categoryId) : "");
      setSelectedSubcategoryId(transaction.subcategoryId ? String(transaction.subcategoryId) : "");
      setAmount(Number(transaction.amount));
      setOriginalAmount(Number(transaction.amount));
      setUpdateFuture(false);
      setSelectedAccountId("");
      setSelectedDestinationAccountId("");

      getTransactionDetailsForEdit(Number(transaction.id)).then((details: TransactionProp | null) => {
        const dataToUse = details || transaction;
        setFullTransaction(dataToUse as TransactionProp);
        setSelectedAccountId(
          dataToUse.accountId ? String(dataToUse.accountId) :
            dataToUse.creditCardId ? `cc-${dataToUse.creditCardId}` : ""
        );
        if (dataToUse.type === 'transfer' && dataToUse.destinationAccountId) {
          setSelectedDestinationAccountId(String(dataToUse.destinationAccountId));
        }
        if (dataToUse.type === 'credit_card_expense' && dataToUse.competencyMonth) {
          setSelectedInvoiceMonth(dataToUse.competencyMonth);
        }
      });
    }
  }, [open, transaction]);

  const filteredCategories = useMemo(() => {
    if (!formData?.categories || !transaction) return [];
    const targetType = transaction.type === "income" ? "income" : "expense";
    return formData.categories.filter((c: Category) => c.type === targetType || c.type === 'expense'); // transfer/credit_card_expense use expense categories
  }, [formData, transaction]);

  const activeSubcategories = useMemo(() => {
    if (!formData?.categories || !selectedCategoryId) return [];
    const cat = formData.categories.find((c: Category) => c.id === Number(selectedCategoryId));
    return cat?.subcategories || [];
  }, [formData, selectedCategoryId]);

  const getDefaultInvoiceMonth = (closingDay: number, dateStr: string) => {
    const baseDate = parseISO(dateStr);
    if (baseDate.getDate() > closingDay) {
      const next = addMonths(baseDate, 1);
      return format(next, "yyyy-MM");
    }
    return format(baseDate, "yyyy-MM");
  };

  const invoiceOptions = useMemo(() => {
    if (!selectedAccountId || !selectedAccountId.startsWith('cc-') || !formData?.creditCards) return [];
    const cardId = Number(selectedAccountId.replace('cc-', ''));
    const card = formData.creditCards.find((c: CreditCard) => c.id === cardId);
    if (!card) return [];

    let baseDate: Date;
    if (transaction?.type === 'credit_card_expense' && transaction.competencyMonth) {
      const [year, month] = transaction.competencyMonth.split("-").map(Number);
      baseDate = new Date(year, month - 1, 1);
    } else {
      const defaultMonth = getDefaultInvoiceMonth(card.closingDay, transaction?.date ? transaction.date.substring(0, 10) : new Date().toISOString());
      const [year, month] = defaultMonth.split("-").map(Number);
      baseDate = new Date(year, month - 1, 1);
    }

    const options: { value: string; label: string }[] = [];
    for (let i = -3; i < 7; i++) {
      const d = addMonths(baseDate, i);
      const value = format(d, "yyyy-MM");
      const label = format(d, "MMMM/yyyy", { locale: ptBR });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      options.push({ value, label: capitalizedLabel });
    }
    return options;
  }, [selectedAccountId, formData?.creditCards, transaction?.type, transaction?.competencyMonth, transaction?.date]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transaction) return;
    setIsPending(true);
    setFormError("");

    const form = new FormData(e.currentTarget);
    const description = form.get("description") as string;
    const amount = form.get("amount") as string;
    const date = form.get("date") as string;

    let competencyMonth = date.substring(0, 7);
    const isCreditCard = selectedAccountId && selectedAccountId.startsWith('cc-');
    if (isCreditCard && selectedInvoiceMonth) {
      competencyMonth = selectedInvoiceMonth;
    }

    const accountId = selectedAccountId && !selectedAccountId.startsWith('cc-') ? Number(selectedAccountId) : null;
    const creditCardId = selectedAccountId && selectedAccountId.startsWith('cc-') ? Number(selectedAccountId.replace('cc-', '')) : null;

    let type = transaction.type;
    if (transaction.type === 'expense' && isCreditCard) {
      type = 'credit_card_expense';
    } else if (transaction.type === 'credit_card_expense' && !isCreditCard) {
      type = 'expense';
    }

    const updateData = {
      description,
      amount,
      date,
      competencyMonth,
      categoryId: Number(selectedCategoryId),
      subcategoryId: selectedSubcategoryId ? Number(selectedSubcategoryId) : null,
      accountId,
      creditCardId,
      type,
      destinationAccountId: selectedDestinationAccountId && transaction.type === 'transfer' ? Number(selectedDestinationAccountId) : undefined,
      updateFuture,
    };

    console.log("updateData => ", updateData, transaction.id)

    const res = await updateTransaction(Number(transaction.id), updateData);

    setIsPending(false);
    if (res.success) {
      onOpenChange(false);
      router.refresh();
    } else {
      setFormError(res.error || "Erro ao atualizar a transação.");
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Transação</DialogTitle>
          <DialogDescription className="sr-only">
            Modifique os dados da transação selecionada.
          </DialogDescription>
        </DialogHeader>

        {open && formData ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" name="description" defaultValue={transaction.description} required />
            </div>

            {transaction.type === 'transfer' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="accountId">Conta Origem</Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId} required>
                    <SelectTrigger className="w-full h-10 bg-background text-sm flex items-center justify-between">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.accounts.map((a: { id: string | number; name: string }) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="destinationAccountId">Conta Destino</Label>
                  <Select value={selectedDestinationAccountId} onValueChange={setSelectedDestinationAccountId} required>
                    <SelectTrigger className="w-full h-10 bg-background text-sm flex items-center justify-between">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.accounts.map((a: { id: string | number; name: string }) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="accountId">Conta</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId} required>
                  <SelectTrigger className="w-full h-10 bg-background text-sm flex items-center justify-between">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.accounts.map((a: { id: string | number; name: string }) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                    {(transaction.type === 'credit_card_expense' || transaction.type === 'expense') && formData.creditCards.map((c: { id: string | number; name: string }) => (
                      <SelectItem key={`cc-${c.id}`} value={`cc-${c.id}`}>{c.name} (Cartão)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedAccountId && selectedAccountId.startsWith('cc-') && invoiceOptions.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="invoiceMonth">Fatura</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Valor</Label>
                <CurrencyInput id="amount" name="amount" value={amount} onValueChange={setAmount} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Data</Label>
                <DatePicker id="date" name="date" defaultValue={transaction.date.substring(0, 10)} required />
              </div>
            </div>

            {(fullTransaction?.installmentTotal || fullTransaction?.fixedTransactionId) && amount !== originalAmount ? (
              <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-0.5">
                  <Label className="text-sm cursor-pointer" onClick={() => setUpdateFuture(!updateFuture)}>
                    Alterar o valor das próximas também?
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {fullTransaction.fixedTransactionId
                      ? "O novo valor será aplicado a todas as ocorrências futuras."
                      : "O novo valor será aplicado a todas as parcelas seguintes."}
                  </p>
                </div>
                <Switch checked={updateFuture} onCheckedChange={setUpdateFuture} />
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="categoryId">Categoria</Label>
                <Select value={selectedCategoryId} onValueChange={(val) => {
                  setSelectedCategoryId(val);
                  setSelectedSubcategoryId("");
                }}>
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
                <Select
                  value={selectedSubcategoryId}
                  onValueChange={setSelectedSubcategoryId}
                  disabled={!selectedCategoryId || activeSubcategories.length === 0}
                  required={transaction.type !== "transfer"}
                >
                  <SelectTrigger className="w-full h-10 bg-background text-sm flex items-center justify-between">
                    <SelectValue placeholder={activeSubcategories.length === 0 ? "Selecione a categoria" : "Selecione..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSubcategories.map((sc: Subcategory) => (
                      <SelectItem key={sc.id} value={String(sc.id)}>
                        {sc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive text-center">{formError}</p>
            )}

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isPending} disabled={isPending}>

                {isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
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
