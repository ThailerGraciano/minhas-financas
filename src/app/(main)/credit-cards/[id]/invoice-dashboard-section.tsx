"use client";

import type { TreemapDataSets, TreemapNode } from "@/app/actions/dashboard";
import { ExpenseTreemap } from "@/components/charts/ExpenseTreemap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Grid3X3, LayoutDashboard } from "lucide-react";
import { useMemo, useState } from "react";

interface InvoiceTransactionItem {
  id: number;
  description: string;
  amount: string | number;
  installmentTotal?: number | null;
  fixedTransactionId?: string | null;
  isFixed?: boolean | null;
  category?: { id?: number; name: string; icon?: string | null } | null;
  subcategory?: { id?: number; name: string; categoryId?: number } | null;
}

interface InvoiceDashboardSectionProps {
  transactions: InvoiceTransactionItem[];
}

export function InvoiceDashboardSection({ transactions }: InvoiceDashboardSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const treemapData = useMemo<TreemapDataSets>(() => {
    const roots: TreemapDataSets = {
      all: { name: "Despesas", children: [] },
      variable: { name: "Despesas Variáveis", children: [] },
      installment: { name: "Despesas Parceladas", children: [] },
      fixed: { name: "Despesas Fixas", children: [] },
    };

    const maps = {
      all: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
      variable: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
      installment: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
      fixed: { cat: new Map<string, TreemapNode>(), sub: new Map<string, TreemapNode>() },
    };

    const addToTree = (
      treeType: keyof TreemapDataSets,
      desc: string,
      id: string | number,
      val: number,
      catName: string,
      subName: string,
    ) => {
      const root = roots[treeType];
      const { cat, sub } = maps[treeType];

      if (!cat.has(catName)) {
        const newCat: TreemapNode = { name: catName, children: [] };
        cat.set(catName, newCat);
        root.children!.push(newCat);
      }
      const catNode = cat.get(catName)!;
      const subcatKey = `${catName}-${subName}`;
      if (!sub.has(subcatKey)) {
        const newSub: TreemapNode = { name: subName, children: [] };
        sub.set(subcatKey, newSub);
        catNode.children!.push(newSub);
      }
      const subNode = sub.get(subcatKey)!;
      subNode.children!.push({
        name: desc,
        value: val,
        id: String(id),
      });
    };

    for (const t of transactions) {
      const val = Number(t.amount);
      if (val <= 0) continue;

      const catName = t.category?.name || "Sem Categoria";
      const subName = t.subcategory?.name || "Geral";
      const isInstallment = Boolean(t.installmentTotal && t.installmentTotal > 1);
      const isFixed = Boolean(t.fixedTransactionId || t.isFixed);

      addToTree("all", t.description, t.id, val, catName, subName);

      if (isInstallment) {
        addToTree("installment", t.description, t.id, val, catName, subName);
      } else if (isFixed) {
        addToTree("fixed", t.description, t.id, val, catName, subName);
      } else {
        addToTree("variable", t.description, t.id, val, catName, subName);
      }
    }

    return roots;
  }, [transactions]);

  return (
    <Card>
      <CardHeader
        className="flex flex-row items-center justify-between gap-2 px-4 sm:px-6 cursor-pointer select-none"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm md:text-base font-semibold">Dashboard</CardTitle>
            <p className="text-xs text-muted-foreground">Mapeamento proporcional das despesas desta fatura</p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="rounded-full text-xs font-semibold px-3.5 border-white/10 hover:bg-white/5 cursor-pointer shrink-0"
        >
          {isOpen ? (
            <>
              Recolher
              <ChevronUp className="w-3.5 h-3.5 ml-1.5" />
            </>
          ) : (
            <>
              Expandir
              <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
            </>
          )}
        </Button>
      </CardHeader>

      {isOpen && (
        <CardContent className="px-4 sm:px-6 pt-2 border-t border-white/5 animate-in fade-in-50 duration-200">
          <div className="flex flex-row items-center gap-2 mb-4 pt-2">
            <Grid3X3 className="h-5 w-5 text-primary shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-bold">Mapeamento de Despesas</h3>
              <p className="text-xs text-muted-foreground">
                Distribuição proporcional de gastos por categoria nesta fatura
              </p>
            </div>
          </div>
          <ExpenseTreemap data={treemapData} />
        </CardContent>
      )}
    </Card>
  );
}

