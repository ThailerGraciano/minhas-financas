"use client";

import type { TreemapDataSets, TreemapNode } from "@/app/actions/dashboard";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";

interface ExpensesBentoGridProps {
  data: TreemapDataSets | TreemapNode;
}

export function ExpensesBentoGrid({ data }: ExpensesBentoGridProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const rootNode: TreemapNode = "all" in data ? data.all : data;

  // Calcula os valores agregados de cada categoria
  const categories = (rootNode.children || [])
    .map((cat) => {
      let total = 0;
      const countValue = (node: TreemapNode) => {
        if (node.value) total += node.value;
        if (node.children) node.children.forEach(countValue);
      };
      countValue(cat);
      return { name: cat.name, total };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const grandTotal = categories.reduce((acc, curr) => acc + curr.total, 0);

  if (categories.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-2xl">
        Nenhuma despesa para exibir neste período.
      </div>
    );
  }

  // Paletas de cores para os blocos da grade Bento
  const blockStyles = [
    {
      bg: "bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent",
      border: "border-blue-500/20 hover:border-blue-500/40",
      iconBg: "bg-blue-500/20 text-blue-400",
      badge: "text-blue-400 bg-blue-500/10",
    },
    {
      bg: "bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent",
      border: "border-orange-500/20 hover:border-orange-500/40",
      iconBg: "bg-orange-500/20 text-orange-400",
      badge: "text-orange-400 bg-orange-500/10",
    },
    {
      bg: "bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent",
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      iconBg: "bg-emerald-500/20 text-emerald-400",
      badge: "text-emerald-400 bg-emerald-500/10",
    },
    {
      bg: "bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent",
      border: "border-purple-500/20 hover:border-purple-500/40",
      iconBg: "bg-purple-500/20 text-purple-400",
      badge: "text-purple-400 bg-purple-500/10",
    },
    {
      bg: "bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent",
      border: "border-amber-500/20 hover:border-amber-500/40",
      iconBg: "bg-amber-500/20 text-amber-400",
      badge: "text-amber-400 bg-amber-500/10",
    },
    {
      bg: "bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent",
      border: "border-rose-500/20 hover:border-rose-500/40",
      iconBg: "bg-rose-500/20 text-rose-400",
      badge: "text-rose-400 bg-rose-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {categories.map((cat, idx) => {
        const percent = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0;
        // As 2 maiores categorias ocupam 2 colunas no grid Bento assimétrico
        const isDominant = idx === 0 || idx === 1;
        const style = blockStyles[idx % blockStyles.length];

        return (
          <div
            key={cat.name}
            className={cn(
              "rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between border shadow-sm transition-all duration-200 hover:scale-[1.01]",
              isDominant ? "col-span-2 min-h-[140px]" : "col-span-1 min-h-[120px]",
              style.bg,
              style.border,
            )}
          >
            {/* Top row: Icon on left, Percentage right-aligned on right */}
            <div className="flex items-center justify-between gap-2">
              <div
                className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm", style.iconBg)}
              >
                <CategoryIcon name={cat.name} className="w-4 h-4" />
              </div>
              <span
                className={cn(
                  "font-bold text-xs sm:text-sm px-2 py-0.5 rounded-full border border-white/5",
                  style.badge,
                )}
              >
                {percent.toFixed(0)}%
              </span>
            </div>

            {/* Middle: Category name */}
            <div className="mt-3">
              <span
                className={cn(
                  "font-semibold text-foreground/90 block truncate",
                  isDominant ? "text-base sm:text-lg" : "text-xs sm:text-sm",
                )}
              >
                {cat.name}
              </span>
            </div>

            {/* Base: Total value */}
            <div
              className={cn(
                "font-black tracking-tight text-foreground mt-1",
                isDominant ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
              )}
            >
              {formatCurrency(cat.total)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
