"use client";

import { deleteBudgetLimit, saveBudgetLimit, type BudgetPillar } from "@/app/actions/budgets";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  roundCurrency,
  validateAllocationToIncome,
  type BudgetIncomeSource,
  type BudgetPlanItem,
} from "@/lib/budget-planner-utils";
import { cn } from "@/lib/utils";
import { AlertCircle, Heart, Sparkles, Target, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export interface BudgetEditTarget {
  id?: number;
  categoryId: number;
  categoryName?: string;
  subcategoryId?: number | null;
  subcategoryName?: string;
  amount: number;
  pillar: BudgetPillar;
  incomeSourceId?: string | null;
}

interface BudgetLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  freeBalance: number;
  categories: Array<{
    id: number;
    name: string;
    subcategories: Array<{ id: number; name: string }>;
  }>;
  selectedIncomes?: BudgetIncomeSource[];
  allItems?: BudgetPlanItem[];
  editTarget?: BudgetEditTarget | null;
  onSuccess?: () => void;
}

interface BudgetLimitFormProps {
  month: string;
  freeBalance: number;
  categories: Array<{
    id: number;
    name: string;
    subcategories: Array<{ id: number; name: string }>;
  }>;
  selectedIncomes: BudgetIncomeSource[];
  allItems: BudgetPlanItem[];
  editTarget?: BudgetEditTarget | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function BudgetLimitForm({
  month,
  freeBalance,
  categories,
  selectedIncomes,
  allItems,
  editTarget,
  onClose,
  onSuccess,
}: BudgetLimitFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const [categoryId, setCategoryId] = useState<string>(
    editTarget ? String(editTarget.categoryId) : categories[0] ? String(categories[0].id) : "",
  );
  const [subcategoryId, setSubcategoryId] = useState<string>(
    editTarget?.subcategoryId ? String(editTarget.subcategoryId) : "all",
  );
  const [amount, setAmount] = useState<number | undefined>(
    editTarget?.amount && editTarget.amount > 0 ? editTarget.amount : undefined,
  );
  const [pillar, setPillar] = useState<BudgetPillar>(editTarget?.pillar || "needs");
  const [incomeSourceId, setIncomeSourceId] = useState<string>(
    editTarget?.incomeSourceId ?? "__none__",
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const selectedCategory = categories.find((c) => String(c.id) === categoryId);
  const availableSubcategories = selectedCategory?.subcategories || [];

  const currentItemKey =
    subcategoryId === "all" ? `cat:${categoryId}` : `sub:${subcategoryId}`;
  const targetIncomeId = incomeSourceId === "__none__" ? null : incomeSourceId;
  const candidateAmount = amount && amount > 0 ? roundCurrency(amount) : 0;

  const validation = validateAllocationToIncome(
    currentItemKey,
    candidateAmount,
    targetIncomeId,
    selectedIncomes,
    allItems,
  );

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    setSubcategoryId("all");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryId) {
      toast.error("Selecione uma categoria principal.");
      return;
    }

    if (!amount || amount <= 0) {
      toast.error("Informe um valor de limite válido.");
      return;
    }

    if (!validation.valid) {
      toast.error(validation.reason || "Capacidade insuficiente na receita selecionada.");
      return;
    }

    setIsPending(true);

    const res = await saveBudgetLimit({
      id: editTarget?.id,
      categoryId: Number(categoryId),
      subcategoryId: subcategoryId === "all" ? null : Number(subcategoryId),
      amount,
      pillar,
      month,
      incomeSourceId: targetIncomeId,
    });

    setIsPending(false);

    if (res.success) {
      toast.success("Limite orçamentário salvo com sucesso!");
      onClose();
      router.refresh();
      if (onSuccess) onSuccess();
    } else {
      toast.error(res.error || "Erro ao salvar orçamento.");
    }
  };

  const handleDelete = async () => {
    if (!editTarget?.id) return;
    if (!confirm("Deseja realmente remover este limite orçamentário?")) return;

    setIsPending(true);
    const res = await deleteBudgetLimit(editTarget.id);
    setIsPending(false);

    if (res.success) {
      toast.success("Orçamento removido com sucesso!");
      onClose();
      router.refresh();
      if (onSuccess) onSuccess();
    } else {
      toast.error(res.error || "Erro ao remover orçamento.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Categoria Principal */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Categoria Principal</Label>
        <Select
          value={categoryId}
          onValueChange={handleCategoryChange}
          disabled={Boolean(editTarget?.id)}
        >
          <SelectTrigger className="h-11 w-full rounded-xl bg-muted/40 border-input focus:ring-2 focus:ring-primary">
            <SelectValue placeholder="Selecione a categoria..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subcategoria */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Subcategoria</Label>
        <Select
          value={subcategoryId}
          onValueChange={setSubcategoryId}
          disabled={Boolean(editTarget?.id)}
        >
          <SelectTrigger className="h-11 w-full rounded-xl bg-muted/40 border-input focus:ring-2 focus:ring-primary">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as subcategorias (Teto Global Pai)</SelectItem>
            {availableSubcategories.map((sc) => (
              <SelectItem key={sc.id} value={String(sc.id)}>
                {sc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Receita de Origem (Opcional) */}
      {selectedIncomes.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Vincular a uma Receita Fixa (Opcional)
          </Label>
          <Select value={incomeSourceId} onValueChange={setIncomeSourceId}>
            <SelectTrigger className="h-11 w-full rounded-xl bg-muted/40 border-input focus:ring-2 focus:ring-primary">
              <SelectValue placeholder="Sem receita vinculada..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem receita vinculada (Bandeja externa)</SelectItem>
              {selectedIncomes.map((inc) => {
                const otherAllocated = allItems
                  .filter((i) => i.itemKey !== currentItemKey && i.incomeSourceId === inc.id)
                  .reduce((acc, curr) => acc + curr.amount, 0);
                const avail = roundCurrency(Math.max(0, inc.amount - otherAllocated));
                return (
                  <SelectItem key={inc.id} value={inc.id}>
                    {inc.name} — Disponível: {formatCurrency(avail)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {!validation.valid && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{validation.reason}</span>
            </div>
          )}
        </div>
      )}

      {/* Valor Mensal (R$) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Teto de Gasto Mensal (R$)</Label>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            Saldo previsto:{" "}
            <strong
              className={
                freeBalance >= 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"
              }
            >
              {formatCurrency(freeBalance)}
            </strong>
          </span>
        </div>
        <CurrencyInput
          name="amount"
          value={amount}
          onValueChange={setAmount}
          placeholder="R$ 0,00"
          className="h-13 text-2xl font-black text-center rounded-xl bg-muted/40 border-input focus:ring-2 focus:ring-primary text-foreground"
          required
          autoFocus
        />
      </div>

      {/* Seleção de Pilar (Zero-Based Budgeting) */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Pilar (Zero-Based Budgeting)</Label>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => setPillar("needs")}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer gap-1.5",
              pillar === "needs"
                ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/40"
                : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10",
            )}
          >
            <Heart className="w-4 h-4" />
            <span className="text-xs font-semibold leading-tight">Necessidades Fixas</span>
          </button>

          <button
            type="button"
            onClick={() => setPillar("lifestyle")}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer gap-1.5",
              pillar === "lifestyle"
                ? "border-primary bg-amber-500/10 text-amber-400 shadow-sm ring-1 ring-primary/40"
                : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10",
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold leading-tight">Estilo de Vida</span>
          </button>

          <button
            type="button"
            onClick={() => setPillar("goals")}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer gap-1.5",
              pillar === "goals"
                ? "border-primary bg-emerald-500/10 text-emerald-400 shadow-sm ring-1 ring-primary/40"
                : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10",
            )}
          >
            <Target className="w-4 h-4" />
            <span className="text-xs font-semibold leading-tight">Metas & Aportes</span>
          </button>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="pt-2 flex items-center gap-2">
        {editTarget?.id && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            disabled={isPending}
            className="h-12 w-12 rounded-xl shrink-0"
            title="Excluir limite orçamentário"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        )}

        <Button
          type="submit"
          disabled={isPending || !validation.valid}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-md cursor-pointer transition-all"
        >
          {isPending ? "Salvando..." : "Salvar Orçamento"}
        </Button>
      </div>
    </form>
  );
}

export function BudgetLimitDialog({
  open,
  onOpenChange,
  month,
  freeBalance,
  categories,
  selectedIncomes = [],
  allItems = [],
  editTarget,
  onSuccess,
}: BudgetLimitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-white/10 p-5 sm:p-6 shadow-2xl">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-bold text-foreground">
            {editTarget?.id ? "Editar Limite Orçamentário" : "Novo Limite Orçamentário"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Defina o teto de gastos no modelo Orçamento Base Zero para o mês selecionado.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <BudgetLimitForm
            key={
              editTarget?.id
                ? `edit-${editTarget.id}`
                : `new-${editTarget?.categoryId || categories[0]?.id || 0}-${editTarget?.subcategoryId || "all"}`
            }
            month={month}
            freeBalance={freeBalance}
            categories={categories}
            selectedIncomes={selectedIncomes}
            allItems={allItems}
            editTarget={editTarget}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
