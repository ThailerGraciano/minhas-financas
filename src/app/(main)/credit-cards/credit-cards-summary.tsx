"use client";

import { getCreditCardsCategorySummary } from "@/app/actions/credit-cards";
import { MarketCategoryChart } from "@/components/market-category-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { CreditCardType } from "./credit-card-list";

interface CreditCardsSummaryProps {
  cards: CreditCardType[];
  selectedMonth: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);

export function CreditCardsSummary({ cards, selectedMonth }: CreditCardsSummaryProps) {
  const [categoryData, setCategoryData] = useState<{ category: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setIsLoading(true);
      const data = await getCreditCardsCategorySummary(selectedMonth);
      if (active) {
        setCategoryData(data);
        setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, [selectedMonth]);

  const totalInvoice = cards.reduce((acc, card) => acc + (card.invoice_total || 0), 0);
  const totalPaid = cards.reduce((acc, card) => acc + (card.invoice_paid || 0), 0);
  const totalPending = cards.reduce((acc, card) => acc + (card.invoice_pending || 0), 0);
  const totalLimit = cards.reduce((acc, card) => acc + Number(card.creditLimit || 0), 0);

  const percentageUsed = totalLimit > 0 ? (totalInvoice / totalLimit) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-6 mt-8 mb-8">
      {/* Resumo das Faturas */}
      <Card className="rounded-none sm:rounded-[2rem] border-transparent shadow-sm flex flex-col h-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Resumo das Faturas</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center gap-6 pt-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-orange-500/10 p-2 rounded-full">
                <Wallet className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Total das Faturas</p>
            </div>
            <h3 className="text-4xl font-bold">{formatCurrency(totalInvoice)}</h3>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Uso do Limite Global ({formatCurrency(totalLimit)})</span>
                <span className="font-medium">{percentageUsed.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(percentageUsed, 100)} className="h-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-4 mt-2">
            <div className="bg-green-500/5 rounded-2xl p-2 md:p-4 border border-green-500/10 min-w-0">
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <TrendingDown className="w-3 h-3 md:w-4 md:h-4 shrink-0 text-green-500" />
                <p className="text-[10px] md:text-sm text-muted-foreground truncate">Pago</p>
              </div>
              <p className="text-sm md:text-xl font-bold text-green-500 truncate">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-red-500/5 rounded-2xl p-2 md:p-4 border border-red-500/10 min-w-0">
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 shrink-0 text-red-500" />
                <p className="text-[10px] md:text-sm text-muted-foreground truncate">Pendente</p>
              </div>
              <p className="text-sm md:text-xl font-bold text-red-500 truncate">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Categorias */}
      <div className="h-full">
        {isLoading ? (
          <Card className="rounded-none sm:rounded-[2rem] border-transparent shadow-sm flex flex-col h-full w-full overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold">Gastos por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center min-h-[250px]">
              <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-40 h-40 rounded-full bg-muted"></div>
                <div className="h-4 w-24 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <MarketCategoryChart data={categoryData} />
        )}
      </div>
    </div>
  );
}
