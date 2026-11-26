"use client";

import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";
import type { CategoryConsumptionSummary } from "@/lib/consumption-intelligence";
import { cn } from "@/lib/utils";
import { AlertCircle, Filter } from "lucide-react";
import { CONFIDENCE_META, STATUS_META, formatCurrencyBRL } from "./constants";

interface CategoryBreakdownTableProps {
  categories: CategoryConsumptionSummary[];
  showBalance?: boolean;
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  onAuditCategory?: (categoryId: number) => void;
}

export function CategoryBreakdownTable({
  categories,
  showBalance = true,
  selectedCategoryId,
  onSelectCategory,
  onAuditCategory,
}: CategoryBreakdownTableProps) {
  if (categories.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground border border-dashed border-white/10 rounded-2xl px-4 text-center">
        Nenhuma categoria com consumo recorrente encontrado nesta janela de análise.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Clique em uma categoria para filtrar o gráfico semanal ou auditar os lançamentos.</span>
        {selectedCategoryId !== null && (
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 text-[11px] font-medium cursor-pointer hover:bg-primary/25"
          >
            <Filter className="h-3 w-3" />
            Mostrar todas as categorias
          </button>
        )}
      </div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-2.5 md:hidden">
        {categories.map((cat) => {
          const statusMeta = STATUS_META[cat.status];
          const confMeta = CONFIDENCE_META[cat.confidence];
          const isSelected = selectedCategoryId === cat.categoryId;

          return (
            <div
              key={cat.categoryId}
              className={cn(
                "rounded-2xl border p-3.5 space-y-2.5 transition-colors",
                isSelected ? "bg-primary/10 border-primary/40" : "bg-white/[0.025] border-white/[0.07]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                    <CategoryIcon name={cat.categoryIcon} className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">{cat.categoryName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {cat.referenceSource === "provisional_budget"
                        ? "Orçamento provisório"
                        : `${cat.validObservations}/3 comp. no histórico`}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", statusMeta.badgeClass)}>
                  {statusMeta.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="block text-[10px] text-muted-foreground">Média semanal</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrencyBRL(cat.weeklyHistoricalMean, showBalance)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground">Realizado</span>
                  <span className="font-bold tabular-nums">{formatCurrencyBRL(cat.realizedTotal, showBalance)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground">Previsão fechamento</span>
                  <span className="font-semibold tabular-nums text-primary">
                    {cat.projectedClosing !== null
                      ? formatCurrencyBRL(cat.projectedClosing, showBalance)
                      : "Sem previsão"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground">Variação até hoje</span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      cat.variationAmount > 0 ? "text-rose-400" : "text-emerald-400",
                    )}
                  >
                    {cat.referenceSource === "none"
                      ? "—"
                      : `${cat.variationAmount > 0 ? "+" : ""}${formatCurrencyBRL(cat.variationAmount, showBalance)}`}
                    {cat.variationPercent !== null
                      ? ` (${cat.variationPercent > 0 ? "+" : ""}${cat.variationPercent.toFixed(0)}%)`
                      : ""}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[11px]">
                <Badge variant="outline" className={cn("text-[10px]", confMeta.badgeClass)}>
                  Confiança: {confMeta.label}
                </Badge>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectCategory(isSelected ? null : cat.categoryId)}
                    className="text-primary font-medium hover:underline cursor-pointer"
                  >
                    {isSelected ? "Limpar filtro" : "Ver no gráfico"}
                  </button>
                  {onAuditCategory && (
                    <button
                      type="button"
                      onClick={() => onAuditCategory(cat.categoryId)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Auditar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.07] text-muted-foreground text-left">
              <th className="py-2.5 px-3 font-medium">Categoria</th>
              <th className="py-2.5 px-3 font-medium text-right">Média semanal</th>
              <th className="py-2.5 px-3 font-medium text-right">Realizado</th>
              <th className="py-2.5 px-3 font-medium text-right">Previsão fech.</th>
              <th className="py-2.5 px-3 font-medium text-right">Variação (até hoje)</th>
              <th className="py-2.5 px-3 font-medium">Situação</th>
              <th className="py-2.5 px-3 font-medium">Confiança</th>
              <th className="py-2.5 px-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {categories.map((cat) => {
              const statusMeta = STATUS_META[cat.status];
              const confMeta = CONFIDENCE_META[cat.confidence];
              const isSelected = selectedCategoryId === cat.categoryId;

              return (
                <tr
                  key={cat.categoryId}
                  className={cn(
                    "transition-colors hover:bg-white/[0.04]",
                    isSelected && "bg-primary/10",
                  )}
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <CategoryIcon name={cat.categoryIcon} className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="truncate max-w-[160px]">{cat.categoryName}</span>
                          {cat.referenceSource === "provisional_budget" && (
                            <span
                              title="Sem histórico suficiente: utilizando orçamento como referência provisória"
                              className="inline-flex items-center text-amber-400"
                            >
                              <AlertCircle className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {cat.referenceSource === "provisional_budget"
                            ? "Orçamento provisório"
                            : `${cat.validObservations}/3 comp. válidas`}
                          {cat.budgetUsagePercent !== null ? ` • ${cat.budgetUsagePercent.toFixed(0)}% orç.` : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                    {cat.referenceSource === "none"
                      ? "—"
                      : formatCurrencyBRL(cat.weeklyHistoricalMean, showBalance)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-foreground">
                    {formatCurrencyBRL(cat.realizedTotal, showBalance)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-primary">
                    {cat.projectedClosing !== null
                      ? formatCurrencyBRL(cat.projectedClosing, showBalance)
                      : "Sem previsão"}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {cat.referenceSource === "none" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={cn(
                          "font-semibold",
                          cat.variationAmount > 0 ? "text-rose-400" : "text-emerald-400",
                        )}
                      >
                        {cat.variationAmount > 0 ? "+" : ""}
                        {formatCurrencyBRL(cat.variationAmount, showBalance)}
                        {cat.variationPercent !== null && (
                          <span className="block text-[10px] opacity-85">
                            {cat.variationPercent > 0 ? "+" : ""}
                            {cat.variationPercent.toFixed(1)}%
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant="outline" className={cn("text-[10px] whitespace-nowrap", statusMeta.badgeClass)}>
                      {statusMeta.label}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge
                      variant="outline"
                      title={cat.confidenceReasons.join(" ")}
                      className={cn("text-[10px] whitespace-nowrap", confMeta.badgeClass)}
                    >
                      {confMeta.label}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectCategory(isSelected ? null : cat.categoryId)}
                        className="text-primary font-medium hover:underline cursor-pointer"
                      >
                        {isSelected ? "Limpar" : "Gráfico"}
                      </button>
                      {onAuditCategory && (
                        <button
                          type="button"
                          onClick={() => onAuditCategory(cat.categoryId)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Auditar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
