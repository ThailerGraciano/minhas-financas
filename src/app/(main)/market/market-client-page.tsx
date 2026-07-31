'use client';

import { ClientDataLoader } from '@/components/client-data-loader';
import { getMarketFullData } from '@/app/actions/market-full';
import { ShoppingCart, PiggyBank } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MarketScannerClient } from './market-scanner-client';
import { MarketCategoryChart } from '@/components/market-category-chart';
import { TopMarketItemsChart } from '@/components/top-market-items-chart';
import { MarketReceiptsList } from '@/components/market-receipts-list';
import { MarketCategoryHistoryChart } from '@/components/market-category-history-chart';
import { MarketCategoryItemsChart } from '@/components/market-category-items-chart';
import { MarketTopCategoryItemsChart } from '@/components/market-top-category-items-chart';
import { MarketAllItemsList } from '@/components/market-all-items-list';

type MarketFullData = Awaited<ReturnType<typeof getMarketFullData>>;

export function MarketClientPage({ closingDay, initialData }: { closingDay: number; initialData: MarketFullData }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <ClientDataLoader
      closingDay={closingDay}
      initialData={initialData}
      fetchAction={getMarketFullData}
      headerContent={<h1 className="text-3xl font-bold tracking-tight">Mercado Inteligente</h1>}
    >
      {(data) => (
        <div className="space-y-6 mt-6 w-full min-w-0">
          <div className="grid gap-6 md:grid-cols-2 min-w-0">
            <Card className="rounded-[2rem] border-transparent shadow-sm">
              <CardContent className="p-6 flex flex-col space-y-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Gasto Total no Mercado</span>
                </div>
                <div className="text-4xl font-bold">{formatCurrency(data.dashboardData.totalSpent)}</div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-transparent shadow-sm">
              <CardContent className="p-6 flex flex-col space-y-4">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-muted-foreground">Economia com Descontos</span>
                </div>
                <div className="text-4xl font-bold text-green-500">{formatCurrency(data.dashboardData.totalDiscount)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 min-w-0">
            <MarketCategoryChart data={data.dashboardData.spendingByCategory} />
            <MarketCategoryItemsChart data={data.dashboardData.spendingByCategory} />
            
            <div className="lg:col-span-2 min-w-0">
              <MarketCategoryHistoryChart data={data.categoryHistory} />
            </div>

            <TopMarketItemsChart data={data.dashboardData.topExpensiveItems} />
            <MarketTopCategoryItemsChart data={data.dashboardData.topItemsByCategory} />
          </div>

          <MarketAllItemsList items={data.dashboardData.allItems} />

          <MarketReceiptsList receipts={data.receipts} />

          <MarketScannerClient />
        </div>
      )}
    </ClientDataLoader>
  );
}
