"use client";

import type { CategoryBudgetHierarchy, SubcategoryBudgetHierarchy } from "@/app/actions/budgets";
import { CategoryIcon } from "@/components/category-icon";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Edit3, Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";

interface BudgetHierarchyListProps {
  categories: CategoryBudgetHierarchy[];
  onEditLimit: (item: {
    categoryId: number;
    categoryName: string;
    subcategoryId?: number | null;
    subcategoryName?: string;
    amount: number;
    pillar: "needs" | "lifestyle" | "goals";
    id?: number;
  }) => void;
  onAddNew: () => void;
}

export function BudgetHierarchyList({ categories, onEditLimit, onAddNew }: BudgetHierarchyListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const toggleExpand = (catId: number) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: prev[catId] === undefined ? false : !prev[catId],
    }));
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "[&>div]:bg-rose-500";
    if (percent >= 75) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-emerald-500";
  };

  const getPercentTextColor = (percent: number) => {
    if (percent >= 100) return "text-rose-500";
    if (percent >= 75) return "text-amber-500";
    return "text-emerald-500";
  };

  const getPillarBadge = (pillar: "needs" | "lifestyle" | "goals") => {
    switch (pillar) {
      case "needs":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
            Necessidades Fixas
          </span>
        );
      case "lifestyle":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Estilo de Vida
          </span>
        );
      case "goals":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Metas & Aportes
          </span>
        );
    }
  };

  if (categories.length === 0) {
    return (
      <div className="bg-[#1A1A22] rounded-3xl p-8 border border-white/5 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-white/5 text-muted-foreground flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-lg text-foreground">Nenhum orçamento definido para este mês</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Comece distribuindo limites para suas categorias essenciais seguindo a metodologia de Orçamento Base Zero.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddNew}
          className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Definir Primeiro Limite
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-foreground">Categorias e Subcategorias Orçadas</h3>
        <span className="text-xs text-muted-foreground">{categories.length} categorias cadastradas</span>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => {
          // Default: open unless explicitly set to false
          const isExpanded = expandedCategories[cat.id] !== false;
          const progressColor = getProgressColor(cat.percent);
          const percentColor = getPercentTextColor(cat.percent);

          return (
            <div
              key={cat.id}
              className="bg-[#1A1A22] rounded-2xl sm:rounded-3xl border border-white/5 shadow-sm overflow-hidden transition-all duration-200"
            >
              {/* Cabeçalho do Bloco Pai */}
              <div className="p-4 sm:p-5 flex flex-col space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/5 text-primary flex items-center justify-center shrink-0 border border-white/5">
                      <CategoryIcon name={cat.icon || cat.name} className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm sm:text-base truncate">{cat.name}</span>
                        {getPillarBadge(cat.pillar)}
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {cat.subcategories.length} {cat.subcategories.length === 1 ? "subcategoria" : "subcategorias"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end">
                      <div className="text-sm sm:text-base font-bold text-foreground">
                        <span className={percentColor}>{formatCurrency(cat.consumed)}</span>
                        <span className="text-muted-foreground font-normal text-xs sm:text-sm">
                          {" "}
                          / {formatCurrency(cat.limit)}
                        </span>
                      </div>
                      <span className={cn("text-xs font-semibold", percentColor)}>
                        {cat.percent.toFixed(1)}% utilizado
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onEditLimit({
                          categoryId: cat.id,
                          categoryName: cat.name,
                          amount: cat.limit,
                          pillar: cat.pillar,
                          id: cat.budgetId,
                        })
                      }
                      title="Editar Limite da Categoria"
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(cat.id)}
                      title={isExpanded ? "Recolher subcategorias" : "Expandir subcategorias"}
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Barra de Progresso Global Fina */}
                <div className="w-full space-y-1">
                  <Progress
                    value={Math.min(100, Math.max(0, cat.percent))}
                    className={cn("h-1.5 bg-muted/30", progressColor)}
                  />
                </div>

                {/* Detalhes de Consumo (Efetivado vs Pendente) */}
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground pt-0.5">
                  <div className="flex items-center gap-3">
                    <span>
                      Efetivado:{" "}
                      <strong className="text-foreground font-medium">{formatCurrency(cat.effective)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Pendente / Fatura:{" "}
                      <strong className="text-foreground font-medium">{formatCurrency(cat.pending)}</strong>
                    </span>
                  </div>
                  {cat.consumed > cat.limit && cat.limit > 0 && (
                    <span className="text-rose-500 font-bold">
                      Excedido em {formatCurrency(cat.consumed - cat.limit)}
                    </span>
                  )}
                </div>
              </div>

              {/* Linhas das Subcategorias (Cascata com recuo e borda lateral) */}
              {isExpanded && cat.subcategories.length > 0 && (
                <div className="px-4 sm:px-5 pb-4 pt-1 bg-black/20 border-t border-white/5">
                  <div className="space-y-3 pt-3 border-l-2 border-white/10 pl-3 sm:pl-4 ml-2">
                    {cat.subcategories.map((sub: SubcategoryBudgetHierarchy) => {
                      const subProgressColor = getProgressColor(sub.percent);
                      const subPercentColor = getPercentTextColor(sub.percent);

                      return (
                        <div key={sub.id} className="space-y-1.5 py-1">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium text-foreground/90 truncate">{sub.name}</span>
                              {sub.limit === 0 && (
                                <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.2 rounded">
                                  Teto Pai
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-medium text-muted-foreground">
                                <span className={subPercentColor}>{formatCurrency(sub.consumed)}</span>
                                {sub.limit > 0 && <span> / {formatCurrency(sub.limit)}</span>}
                              </span>
                              {sub.limit > 0 && (
                                <span className={cn("font-bold text-[11px]", subPercentColor)}>
                                  ({sub.percent.toFixed(0)}%)
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  onEditLimit({
                                    categoryId: cat.id,
                                    categoryName: cat.name,
                                    subcategoryId: sub.id,
                                    subcategoryName: sub.name,
                                    amount: sub.limit,
                                    pillar: cat.pillar,
                                    id: sub.budgetId,
                                  })
                                }
                                title="Editar Limite da Subcategoria"
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer ml-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Barra de Progresso Individual da Subcategoria */}
                          {sub.limit > 0 && (
                            <Progress
                              value={Math.min(100, Math.max(0, sub.percent))}
                              className={cn("h-1 bg-muted/20", subProgressColor)}
                            />
                          )}

                          {/* Resumo de valores (Efetivado vs Pendente) da Subcategoria */}
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80">
                            <span>Efetivado: {formatCurrency(sub.effective)}</span>
                            <span>•</span>
                            <span>Pendente: {formatCurrency(sub.pending)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
