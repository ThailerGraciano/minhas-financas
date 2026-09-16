"use client";

import type { TreemapNode } from "@/app/actions/dashboard";
import { cn } from "@/lib/utils";

interface ExpensesBentoGridProps {
  data: TreemapNode;
}

export function ExpensesBentoGrid({ data }: ExpensesBentoGridProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  // Calcula os valores agregados de cada categoria
  const categories = (data.children || [])
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
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
        Nenhuma despesa para exibir.
      </div>
    );
  }

  // Define as paletas de cores para os blocos
  const colors = [
    "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    "bg-amber-500/10 text-amber-500 border-amber-500/20",
    "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "bg-rose-500/10 text-rose-500 border-rose-500/20",
    "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {categories.map((cat, idx) => {
        const percent = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0;
        const isDominant = idx === 0 || (idx === 1 && percent > 20); // maiores categorias ocupam 2 colunas
        const colorClass = colors[idx % colors.length];

        return (
          <div
            key={cat.name}
            className={cn(
              "rounded-3xl p-5 flex flex-col justify-between border shadow-sm transition-transform hover:scale-[1.02]",
              isDominant ? "col-span-2 row-span-2 aspect-auto min-h-[140px]" : "col-span-1 aspect-square",
              colorClass,
            )}
          >
            <div className="flex justify-between items-start gap-2">
              <span className={cn("font-medium leading-tight", isDominant ? "text-lg" : "text-sm truncate")}>
                {cat.name}
              </span>
              <span className={cn("font-bold", isDominant ? "text-xl" : "text-sm")}>{percent.toFixed(0)}%</span>
            </div>
            <div className={cn("font-black tracking-tight mt-4", isDominant ? "text-3xl" : "text-lg")}>
              {formatCurrency(cat.total)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
