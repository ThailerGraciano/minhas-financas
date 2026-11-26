"use client";

import { updateTransactionConsumptionNature } from "@/app/actions/consumption-intelligence";
import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  isConsumptionNature,
  isDefaultConsumptionNature,
  type ClassifiedTransaction,
  type ConsumptionNature,
} from "@/lib/consumption-intelligence";
import { cn } from "@/lib/utils";
import { AlertTriangle, CreditCard, Landmark, Layers, Loader2, RotateCcw, Search, Settings2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ALL_NATURE_OPTIONS, NATURE_META, SOURCE_LABELS, formatCurrencyBRL } from "./constants";

interface AuditClassificationPanelProps {
  transactions: ClassifiedTransaction[];
  showBalance?: boolean;
  filterWeek: number | null;
  onFilterWeekChange: (week: number | null) => void;
  filterNature: ConsumptionNature | "all";
  onFilterNatureChange: (nature: ConsumptionNature | "all") => void;
  filterCategoryId: number | null;
  onFilterCategoryIdChange: (catId: number | null) => void;
  onClassificationUpdated: () => Promise<void> | void;
}

export function AuditClassificationPanel({
  transactions,
  showBalance = true,
  filterWeek,
  onFilterWeekChange,
  filterNature,
  onFilterNatureChange,
  filterCategoryId,
  onFilterCategoryIdChange,
  onClassificationUpdated,
}: AuditClassificationPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [applyToRule, setApplyToRule] = useState(false);

  const countsByNature = useMemo(() => {
    const counts: Record<ConsumptionNature, number> = {
      recurring: 0,
      installment: 0,
      fixed: 0,
      extraordinary: 0,
      financial_movement: 0,
      individual_withdrawal: 0,
      unclassified: 0,
    };
    for (const tx of transactions) {
      counts[tx.effectiveNature] += 1;
    }
    return counts;
  }, [transactions]);

  const categoryOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const tx of transactions) {
      if (!map.has(tx.categoryId)) {
        map.set(tx.categoryId, tx.categoryName);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filterNature !== "all" && tx.effectiveNature !== filterNature) return false;
      if (filterWeek !== null && tx.weekNumber !== filterWeek) return false;
      if (filterCategoryId !== null && tx.categoryId !== filterCategoryId) return false;
      if (normalizedQuery) {
        const hay = `${tx.description} ${tx.categoryName} ${tx.subcategoryName ?? ""}`.toLowerCase();
        if (!hay.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [transactions, filterNature, filterWeek, filterCategoryId, searchTerm]);

  const handleChangeNature = async (tx: ClassifiedTransaction, nextValue: string) => {
    if (!isConsumptionNature(nextValue)) return;
    if (nextValue === tx.effectiveNature && tx.effectiveSource === "manual") return;

    const shouldApplyRule =
      applyToRule &&
      !(tx.installmentTotal && tx.installmentTotal > 1) &&
      isDefaultConsumptionNature(nextValue);

    setUpdatingId(tx.id);
    try {
      const res = await updateTransactionConsumptionNature({
        transactionId: tx.id,
        nature: nextValue,
        applyToRuleScope: shouldApplyRule ? "subcategory" : "none",
      });

      if (!res.success) {
        toast.error(res.error || "Falha ao atualizar classificação.");
        return;
      }

      const label = NATURE_META[nextValue].label;
      if (res.updatedCount && res.updatedCount > 1) {
        toast.success(`"${label}" aplicada ao lançamento e às ${res.updatedCount - 1} parcela(s) vinculada(s).`);
      } else if (res.appliedRuleScope === "subcategory") {
        toast.success(`"${label}" salva no lançamento e como regra da subcategoria.`);
      } else if (res.appliedRuleScope === "category") {
        toast.success(`"${label}" salva no lançamento e como regra da categoria.`);
      } else {
        toast.success(`Classificação atualizada para "${label}".`);
      }

      await onClassificationUpdated();
    } catch {
      toast.error("Erro inesperado ao salvar classificação.");
    } finally {
      setUpdatingId(null);
    }
  };

  const hasActiveFilters =
    filterNature !== "all" || filterWeek !== null || filterCategoryId !== null || searchTerm.trim().length > 0;

  return (
    <div className="space-y-3.5">
      {/* Barra de regra de subcategoria/categoria + atalho para /categories */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/[0.025] border border-white/[0.07] px-3 py-2 text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none text-foreground/90">
          <Switch checked={applyToRule} onCheckedChange={setApplyToRule} />
          <span>Salvar também como regra padrão da subcategoria (ou categoria)</span>
        </label>
        <Link
          href="/categories"
          className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span>Gerenciar em Categorias</span>
        </Link>
      </div>

      {/* Filtros rápidos por natureza */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onFilterNatureChange("all")}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer",
            filterNature === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-white/[0.04] text-muted-foreground border-white/[0.08] hover:text-foreground",
          )}
        >
          Todos ({transactions.length})
        </button>
        {(
          [
            "unclassified",
            "recurring",
            "installment",
            "extraordinary",
            "fixed",
            "financial_movement",
            "individual_withdrawal",
          ] as const
        ).map(
          (nat) => {
            const meta = NATURE_META[nat];
            const count = countsByNature[nat];
            if (count === 0 && nat !== "unclassified") return null;
            return (
              <button
                key={nat}
                type="button"
                onClick={() => onFilterNatureChange(filterNature === nat ? "all" : nat)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5",
                  filterNature === nat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white/[0.04] text-muted-foreground border-white/[0.08] hover:text-foreground",
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.dotColor }} />
                <span>
                  {meta.shortLabel} ({count})
                </span>
              </button>
            );
          },
        )}
      </div>

      {/* Barra de filtros adicionais */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar descrição ou categoria..."
            className="h-9 pl-8 text-xs bg-white/[0.03] border-white/[0.08]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={filterWeek === null ? "all" : String(filterWeek)}
            onValueChange={(val) => onFilterWeekChange(val === "all" ? null : Number(val))}
          >
            <SelectTrigger className="h-9 w-[130px] text-xs bg-white/[0.03] border-white/[0.08]">
              <SelectValue placeholder="Semana" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas semanas</SelectItem>
              <SelectItem value="1">Semana 1</SelectItem>
              <SelectItem value="2">Semana 2</SelectItem>
              <SelectItem value="3">Semana 3</SelectItem>
              <SelectItem value="4">Semana 4</SelectItem>
              <SelectItem value="5">Semana 5</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterCategoryId === null ? "all" : String(filterCategoryId)}
            onValueChange={(val) => onFilterCategoryIdChange(val === "all" ? null : Number(val))}
          >
            <SelectTrigger className="h-9 w-[160px] text-xs bg-white/[0.03] border-white/[0.08]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                onFilterNatureChange("all");
                onFilterWeekChange(null);
                onFilterCategoryIdChange(null);
                setSearchTerm("");
              }}
              className="h-9 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
              title="Limpar filtros"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista de lançamentos auditáveis */}
      {filteredTransactions.length === 0 ? (
        <div className="flex h-[150px] items-center justify-center text-xs text-muted-foreground border border-dashed border-white/10 rounded-2xl px-4 text-center">
          Nenhum lançamento encontrado com os filtros atuais nesta competência.
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
          {filteredTransactions.map((tx) => {
            const natureMeta = NATURE_META[tx.effectiveNature];
            const isUpdating = updatingId === tx.id;
            const formattedDate = tx.launchDate.split("-").reverse().join("/");

            return (
              <div
                key={tx.id}
                className={cn(
                  "rounded-2xl border p-3 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3",
                  tx.effectiveNature === "unclassified"
                    ? "bg-rose-500/[0.05] border-rose-500/25"
                    : "bg-white/[0.025] border-white/[0.07]",
                )}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                    <CategoryIcon name={tx.categoryIcon} className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-xs sm:text-sm text-foreground truncate max-w-[280px]">
                        {tx.description}
                      </span>
                      {tx.installmentTotal && tx.installmentTotal > 1 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-sky-500/35 bg-sky-500/10 text-sky-300 gap-1"
                        >
                          <Layers className="h-2.5 w-2.5" />
                          {tx.installmentCurrent ?? "?"}/{tx.installmentTotal}
                        </Badge>
                      )}
                      {tx.isRefund && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/35 text-emerald-300">
                          Estorno
                        </Badge>
                      )}
                      {tx.isAnomalyWarning && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-300 gap-1"
                        >
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Valor atípico
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
                      <span>
                        Sem {tx.weekNumber} • {formattedDate}
                      </span>
                      <span>•</span>
                      <span>
                        {tx.categoryName}
                        {tx.subcategoryName ? ` / ${tx.subcategoryName}` : ""}
                      </span>
                      {(tx.creditCardName || tx.accountName) && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            {tx.creditCardName ? (
                              <CreditCard className="h-3 w-3 text-primary" />
                            ) : (
                              <Landmark className="h-3 w-3 text-muted-foreground" />
                            )}
                            {tx.creditCardName ?? tx.accountName}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground/90">
                      <Badge variant="outline" className="text-[10px] border-white/10 bg-white/[0.03] px-1.5 py-0">
                        {SOURCE_LABELS[tx.effectiveSource]}
                      </Badge>
                      <span>{tx.classificationReason}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                  <span
                    className={cn(
                      "font-bold text-sm tabular-nums",
                      tx.amount < 0 ? "text-emerald-400" : "text-foreground",
                    )}
                  >
                    {formatCurrencyBRL(tx.amount, showBalance)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                    <Select
                      value={tx.effectiveNature}
                      onValueChange={(val) => handleChangeNature(tx, val)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger
                        aria-label={`Classificar natureza de ${tx.description}`}
                        className={cn("h-8 w-[185px] text-xs font-medium", natureMeta.badgeClass)}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_NATURE_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt} className="text-xs">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: NATURE_META[opt].dotColor }}
                              />
                              <span>{NATURE_META[opt].label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
