'use client';

import { getTransactionFormData } from "@/app/actions/form-data";
import { updateTransaction } from "@/app/actions/transactions";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type FormData = NonNullable<Awaited<ReturnType<typeof getTransactionFormData>>>;
type Category = FormData["categories"][0];
type Subcategory = Category["subcategories"][0];

interface EditTransactionDialogProps {
  transaction: any;
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
  
  const router = useRouter();

  useEffect(() => {
    if (open && !formData) {
      getTransactionFormData().then(setFormData);
    }
  }, [open, formData]);

  useEffect(() => {
    if (open && transaction) {
      setSelectedCategoryId(transaction.categoryId ? String(transaction.categoryId) : "");
      setSelectedSubcategoryId(transaction.subcategoryId ? String(transaction.subcategoryId) : "");
      setAmount(Number(transaction.amount));
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setFormError("");

    const form = new FormData(e.currentTarget);
    const description = form.get("description") as string;
    const amount = form.get("amount") as string;
    const date = form.get("date") as string;

    const competencyMonth = date.substring(0, 7);

    const updateData = {
      description,
      amount,
      date,
      competencyMonth,
      categoryId: Number(selectedCategoryId),
      subcategoryId: selectedSubcategoryId ? Number(selectedSubcategoryId) : null,
    };

    const res = await updateTransaction(transaction.id, updateData);

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
                <select
                  name="subcategoryId"
                  value={selectedSubcategoryId}
                  onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  disabled={!selectedCategoryId || activeSubcategories.length === 0}
                  required={transaction.type !== "transfer"}
                >
                  {activeSubcategories.length === 0 && (
                    <option value="">Selecione a categoria</option>
                  )}
                  {activeSubcategories.map((sc: Subcategory) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive text-center">{formError}</p>
            )}

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
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
