"use client";

import { Progress } from "@/components/ui/progress";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface MonthlyBalanceGridProps {
  totalIncome: number;
  totalExpense: number;
}

export function MonthlyBalanceGrid({ totalIncome, totalExpense }: MonthlyBalanceGridProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const totalMoved = totalIncome + totalExpense || 1; // avoid division by zero
  const incomePercent = (totalIncome / totalMoved) * 100;
  const expensePercent = (totalExpense / totalMoved) * 100;

  return (
    <div className="grid gap-4 grid-cols-2">
      {/* Card Receitas */}
      <div className="bg-card rounded-[2rem] border-transparent shadow-sm flex flex-col pt-6 pb-0 overflow-hidden relative">
        <div className="px-4 sm:px-6 mb-4 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-muted-foreground">Receitas</span>
            </div>
            <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              +5.2%
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-foreground">
            <span className="text-muted-foreground text-sm mr-1">R$</span>
            {formatCurrency(totalIncome)}
          </div>
        </div>
        <Progress
          value={Math.min(100, Math.max(0, incomePercent))}
          className="h-1 mt-auto bg-muted/30 [&>div]:bg-emerald-500 rounded-none"
        />
      </div>

      {/* Card Despesas */}
      <div className="bg-card rounded-[2rem] border-transparent shadow-sm flex flex-col pt-6 pb-0 overflow-hidden relative">
        <div className="px-4 sm:px-6 mb-4 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-rose-500" />
              <span className="text-sm font-medium text-muted-foreground">Despesas</span>
            </div>
            <span className="text-xs font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">-2.1%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-foreground">
            <span className="text-muted-foreground text-sm mr-1">R$</span>
            {formatCurrency(totalExpense)}
          </div>
        </div>
        <Progress
          value={Math.min(100, Math.max(0, expensePercent))}
          className="h-1 mt-auto bg-muted/30 [&>div]:bg-rose-500 rounded-none"
        />
      </div>
    </div>
  );
}
