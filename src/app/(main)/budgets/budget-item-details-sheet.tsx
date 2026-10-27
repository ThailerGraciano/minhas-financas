"use client";

import type { BudgetPillar } from "@/app/actions/budgets";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  roundCurrency,
  validateAllocationToIncome,
  type BudgetIncomeSource,
  type BudgetPlanItem,
} from "@/lib/budget-planner-utils";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Banknote,
  Heart,
  Link2Off,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface BudgetItemDetailsSheetProps {
  item: BudgetPlanItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIncomes: BudgetIncomeSource[];
  allItems: BudgetPlanItem[];
  onUpdateItem: (
    itemKey: string,
    updates: {
      amount: number;
      pillar: BudgetPillar;
      incomeSourceId: string | null;
    },
  ) => void;
  onDeleteItem?: (item: BudgetPlanItem) => void;
}

interface BudgetItemDetailsFormProps {
  item: BudgetPlanItem;
  selectedIncomes: BudgetIncomeSource[];
  allItems: BudgetPlanItem[];
  onUpdateItem: (
    itemKey: string,
    updates: {
      amount: number;
      pillar: BudgetPillar;
      incomeSourceId: string | null;
    },
  ) => void;
  onDeleteItem?: (item: BudgetPlanItem) => void;
  onClose: () => void;
}

function BudgetItemDetailsForm({
  item,
  selectedIncomes,
  allItems,
  onUpdateItem,
  onDeleteItem,
  onClose,
}: BudgetItemDetailsFormProps) {
  const [amount, setAmount] = useState<number | undefined>(item.amount);
  const [pillar, setPillar] = useState<BudgetPillar>(item.pillar);
  const [incomeSourceId, setIncomeSourceId] = useState<string>(
    item.incomeSourceId ?? "__none__",
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const targetIncomeId = incomeSourceId === "__none__" ? null : incomeSourceId;
  const candidateAmount = amount && amount > 0 ? roundCurrency(amount) : 0;

  const validation = validateAllocationToIncome(
    item.itemKey,
    candidateAmount,
    targetIncomeId,
    selectedIncomes,
    allItems,
  );

  const currentLinkedIncome = selectedIncomes.find((inc) => inc.id === item.incomeSourceId);
  const utilizationPercent =
    candidateAmount > 0 ? (item.consumed / candidateAmount) * 100 : item.percent;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();

    if (!candidateAmount || candidateAmount <= 0) {
      toast.error("Informe um valor orçado maior que zero.");
      return;
    }

    if (!validation.valid) {
      toast.error(validation.reason || "Capacidade insuficiente na receita selecionada.");
      return;
    }

    onUpdateItem(item.itemKey, {
      amount: candidateAmount,
      pillar,
      incomeSourceId: targetIncomeId,
    });
    toast.success("Item atualizado no planejador!");
    onClose();
  };

  const handleUnlinkNow = () => {
    setIncomeSourceId("__none__");
    onUpdateItem(item.itemKey, {
      amount: candidateAmount > 0 ? candidateAmount : item.amount,
      pillar,
      incomeSourceId: null,
    });
    toast.info(`"${item.label}" movido para Categorias sem receita vinculada.`);
    onClose();
  };

  return (
    <form onSubmit={handleApply} className="flex flex-col flex-1 justify-between gap-6 px-4 pb-6 overflow-y-auto">
      <div className="space-y-5">
        {/* Identificação da Categoria / Subcategoria */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <CategoryIcon name={item.categoryIcon || item.categoryName} className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs text-muted-foreground block truncate">
                {item.subcategoryName ? `Categoria: ${item.categoryName}` : "Categoria Principal"}
              </span>
              <h4 className="text-base font-bold text-foreground truncate">{item.label}</h4>
            </div>
          </div>

          {/* Informações de Consumo do Mês */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Consumo no período:</span>
              <span className="font-bold text-foreground tabular-nums">
                {formatCurrency(item.consumed)} / {formatCurrency(candidateAmount || item.amount)}{" "}
                <span className="text-muted-foreground font-normal">
                  ({utilizationPercent.toFixed(0)}%)
                </span>
              </span>
            </div>
            <Progress
              value={Math.min(100, Math.max(0, utilizationPercent))}
              className={cn(
                "h-1.5 bg-white/10",
                utilizationPercent >= 100
                  ? "[&>div]:bg-rose-500"
                  : utilizationPercent >= 75
                    ? "[&>div]:bg-amber-500"
                    : "[&>div]:bg-emerald-500",
              )}
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
              <span>Efetivado: {formatCurrency(item.effective)}</span>
              <span>Pendente / Fatura: {formatCurrency(item.pending)}</span>
            </div>
          </div>
        </div>

        {/* Status atual de vínculo com receita */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Receita Vinculada (Origem do Recurso)</Label>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-white/5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Banknote className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate font-medium text-foreground">
                {currentLinkedIncome
                  ? `Atualmente em: ${currentLinkedIncome.name}`
                  : "Sem receita vinculada (Bandeja externa)"}
              </span>
            </div>
            {item.incomeSourceId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUnlinkNow}
                className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 shrink-0 cursor-pointer gap-1"
              >
                <Link2Off className="w-3.5 h-3.5" />
                Desvincular
              </Button>
            )}
          </div>

          <Select value={incomeSourceId} onValueChange={setIncomeSourceId}>
            <SelectTrigger className="h-11 w-full rounded-xl bg-muted/40 border-input">
              <SelectValue placeholder="Selecione uma receita de destino..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem receita vinculada (Bandeja externa)</SelectItem>
              {selectedIncomes.map((inc) => {
                const otherAllocated = allItems
                  .filter((i) => i.itemKey !== item.itemKey && i.incomeSourceId === inc.id)
                  .reduce((acc, curr) => acc + curr.amount, 0);
                const avail = roundCurrency(Math.max(0, inc.amount - otherAllocated));
                const fits = candidateAmount <= avail + 0.005;

                return (
                  <SelectItem key={inc.id} value={inc.id}>
                    {inc.name} — Livre: {formatCurrency(avail)}
                    {!fits ? " (Capacidade insuficiente)" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {!validation.valid && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{validation.reason}</span>
            </div>
          )}
        </div>

        {/* Edição do Valor Orçado */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Valor Orçado no Mês (R$)</Label>
            {targetIncomeId && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                Capacidade na receita:{" "}
                <strong className="text-emerald-400">
                  {formatCurrency(validation.remainingCapacity)}
                </strong>
              </span>
            )}
          </div>
          <CurrencyInput
            name="amount"
            value={amount}
            onValueChange={setAmount}
            placeholder="R$ 0,00"
            className="h-13 text-xl font-black text-center rounded-xl bg-muted/40 border-input text-foreground"
            required
          />
        </div>

        {/* Seleção de Pilar */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Pilar (Zero-Based Budgeting)</Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPillar("needs")}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer gap-1",
                pillar === "needs"
                  ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/40"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10",
              )}
            >
              <Heart className="w-4 h-4" />
              <span className="text-[11px] font-semibold leading-tight">Necessidades</span>
            </button>

            <button
              type="button"
              onClick={() => setPillar("lifestyle")}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer gap-1",
                pillar === "lifestyle"
                  ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-sm ring-1 ring-amber-500/40"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10",
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-[11px] font-semibold leading-tight">Estilo de Vida</span>
            </button>

            <button
              type="button"
              onClick={() => setPillar("goals")}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer gap-1",
                pillar === "goals"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-sm ring-1 ring-emerald-500/40"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10",
              )}
            >
              <Target className="w-4 h-4" />
              <span className="text-[11px] font-semibold leading-tight">Metas & Aportes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ações do Painel */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/10">
        {item.budgetId && onDeleteItem && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={() => onDeleteItem(item)}
            className="h-11 w-11 rounded-xl shrink-0 cursor-pointer"
            title="Excluir este limite orçamentário"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-11 rounded-xl border-white/10 flex-1 cursor-pointer"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!validation.valid || !candidateAmount || candidateAmount <= 0}
          className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold flex-1 cursor-pointer"
        >
          Aplicar no Mapa
        </Button>
      </div>
    </form>
  );
}

export function BudgetItemDetailsSheet({
  item,
  open,
  onOpenChange,
  selectedIncomes,
  allItems,
  onUpdateItem,
  onDeleteItem,
}: BudgetItemDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-[#16161D] border-l border-white/10 p-0 flex flex-col"
      >
        <SheetHeader className="p-5 pb-2 border-b border-white/5">
          <SheetTitle className="text-lg font-bold text-foreground">
            Detalhes e Alocação do Orçamento
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Ajuste o valor orçado, o pilar ou escolha a receita fixa que financiará esta categoria.
          </SheetDescription>
        </SheetHeader>

        {open && item && (
          <BudgetItemDetailsForm
            key={`${item.itemKey}-${item.amount}-${item.incomeSourceId ?? "none"}-${item.pillar}`}
            item={item}
            selectedIncomes={selectedIncomes}
            allItems={allItems}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

