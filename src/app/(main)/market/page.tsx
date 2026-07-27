import { Suspense } from 'react';
import { format } from 'date-fns';
import { ShoppingCart, PiggyBank } from 'lucide-react';
import { getSettings } from '@/app/actions/settings';
import { getDefaultCompetencyMonth } from '@/lib/date-utils';
import { getMarketDashboardData, getMarketReceipts, getMarketCategoryHistory } from '@/app/actions/market';
import { CompetencyFilter } from '@/components/competency-filter';
import { Card, CardContent } from '@/components/ui/card';
import { MarketScannerClient } from './market-scanner-client';
import { MarketCategoryChart } from '@/components/market-category-chart';
import { TopMarketItemsChart } from '@/components/top-market-items-chart';
import { MarketReceiptsList } from '@/components/market-receipts-list';
import { MarketCategoryHistoryChart } from '@/components/market-category-history-chart';
import { MarketCategoryItemsChart } from '@/components/market-category-items-chart';
import { MarketTopCategoryItemsChart } from '@/components/market-top-category-items-chart';

export const metadata = {
  title: 'Mercado | Minhas Finanças',
};

export default async function MarketPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const monthParam = searchParams?.month as string | undefined;

  const settingsData = await getSettings();
  const currentMonth = monthParam || getDefaultCompetencyMonth(settingsData.closingDay);

  const [dashboardData, receipts, categoryHistory] = await Promise.all([
    getMarketDashboardData(currentMonth),
    getMarketReceipts(currentMonth),
    getMarketCategoryHistory(currentMonth, 3),
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <h1 className="text-3xl font-bold tracking-tight">Mercado Inteligente</h1>
        <Suspense fallback={null}>
          <CompetencyFilter closingDay={settingsData.closingDay} />
        </Suspense>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-[2rem] border-transparent shadow-sm">
          <CardContent className="p-6 flex flex-col space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Gasto Total no Mercado</span>
            </div>
            <div className="text-4xl font-bold">{formatCurrency(dashboardData.totalSpent)}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-transparent shadow-sm">
          <CardContent className="p-6 flex flex-col space-y-4">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Economia com Descontos</span>
            </div>
            <div className="text-4xl font-bold text-green-500">{formatCurrency(dashboardData.totalDiscount)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MarketCategoryChart data={dashboardData.spendingByCategory} />
        <MarketCategoryItemsChart data={dashboardData.spendingByCategory} />
        
        <div className="lg:col-span-2">
          <MarketCategoryHistoryChart data={categoryHistory} />
        </div>

        <TopMarketItemsChart data={dashboardData.topExpensiveItems} />
        <MarketTopCategoryItemsChart data={dashboardData.topItemsByCategory} />
      </div>

      <MarketReceiptsList receipts={receipts} />

      <MarketScannerClient />
    </div>
  );
}
