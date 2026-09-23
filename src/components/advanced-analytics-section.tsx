"use client";

import { AccountIncomeExpenseChart } from "@/components/account-income-expense-chart";
import { AccountVsGlobalExpenseChart } from "@/components/account-vs-global-expense-chart";
import { GlobalIncomeExpenseChart } from "@/components/global-income-expense-chart";
import { PurchasingPowerChart } from "@/components/purchasing-power-chart";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, LineChart } from "lucide-react";
import { useState } from "react";

interface AdvancedAnalyticsSectionProps {
  incomeVsExpenseData: {
    global: { name: string; income: number; expense: number; baseBalance?: number };
    byAccount: Array<{ accountName: string; income: number; expense: number; baseBalance: number }>;
    accountVsGlobal: Array<{ accountName: string; income: number; expense: number; globalExpense: number }>;
  };
  selectedMonth: string;
}

export function AdvancedAnalyticsSection({ incomeVsExpenseData, selectedMonth }: AdvancedAnalyticsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 shadow-sm p-5 sm:p-6 space-y-4 w-full min-w-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Análises Avançadas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparativos por conta, poder de compra e despesa global
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full text-xs font-semibold px-4 border-white/10 hover:bg-white/5 cursor-pointer"
        >
          {isOpen ? (
            <>
              Recolher
              <ChevronUp className="w-3.5 h-3.5 ml-1.5" />
            </>
          ) : (
            <>
              Ver gráficos
              <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="space-y-6 pt-4 border-t border-white/5 animate-in fade-in-50 duration-300">
          {/* Gráficos Comparativos */}
          <div className="grid gap-6 lg:grid-cols-2">
            <GlobalIncomeExpenseChart initialData={incomeVsExpenseData.global} competencyMonth={selectedMonth} />
            <AccountIncomeExpenseChart initialData={incomeVsExpenseData.byAccount} competencyMonth={selectedMonth} />
          </div>

          {/* Gráficos Analíticos */}
          <div className="grid gap-6 lg:grid-cols-2">
            <PurchasingPowerChart initialData={incomeVsExpenseData.byAccount} competencyMonth={selectedMonth} />
            <AccountVsGlobalExpenseChart
              initialData={incomeVsExpenseData.accountVsGlobal}
              competencyMonth={selectedMonth}
            />
          </div>
        </div>
      )}
    </div>
  );
}
