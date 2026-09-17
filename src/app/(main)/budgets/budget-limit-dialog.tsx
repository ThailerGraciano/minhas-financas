"use client";

import { deleteBudgetLimit, saveBudgetLimit, type BudgetPillar } from "@/app/actions/budgets";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Heart, Sparkles, Target, Trash2 } from "lucide-react";
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
  editTarget?: BudgetEditTarget | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function BudgetLimitForm({ month, freeBalance, categories, editTarget, onClose, onSuccess }: BudgetLimitFormProps) {
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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const selectedCategory = categories.find((c) => String(c.id) === categoryId);
  const availableSubcategories = selectedCategory?.subcategories || [];

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

    setIsPending(true);

    const res = await saveBudgetLimit({
      id: editTarget?.id,
      categoryId: Number(categoryId),
      subcategoryId: subcategoryId === "all" ? null : Number(subcategoryId),
      amount,
      pillar,
      month,
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Categoria Principal */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Categoria Principal</Label>
        <Select value={categoryId} onValueChange={handleCategoryChange} disabled={Boolean(editTarget?.id)}>
          <SelectTrigger className="h-12 w-full rounded-xl bg-muted/40 border-input focus:ring-2 focus:ring-primary">
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
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Subcategoria</Label>
        <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={Boolean(editTarget?.id)}>
          <SelectTrigger className="h-12 w-full rounded-xl bg-muted/40 border-input focus:ring-2 focus:ring-primary">
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

      {/* Tipo de Gasto Mensal (R$) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Tipo de Gasto Mensal (R$)</Label>
          <span className="text-[11px] text-muted-foreground">
            Disponível para alocar:{" "}
            <strong className={freeBalance >= 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
              {formatCurrency(freeBalance)}
            </strong>
          </span>
        </div>
        <CurrencyInput
          name="amount"
          value={amount}
          onValueChange={setAmount}
          placeholder="R$ 0,00"
          className="h-14 text-2xl font-black text-center rounded-xl bg-muted/40 border-input focus:ring-2 focus:ring-primary text-foreground"
          required
          autoFocus
        />
      </div>

      {/* Seleção de Pilar (Zero-Based Budgeting) */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Pilar (Zero-Based Budgeting)</Label>
        <div className="grid grid-cols-3 gap-2.5">
          {/* Necessidades Fixas */}
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

          {/* Estilo de Vida */}
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

          {/* Metas & Aportes */}
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
          disabled={isPending}
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
            key={editTarget?.id ? `edit-${editTarget.id}` : `new-${categories[0]?.id || 0}`}
            month={month}
            freeBalance={freeBalance}
            categories={categories}
            editTarget={editTarget}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
