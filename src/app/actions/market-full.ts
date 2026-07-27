'use server';

import { 
  getMarketDashboardData, 
  getMarketReceipts, 
  getMarketCategoryHistory 
} from './market';

export async function getMarketFullData(month: string) {
  const [dashboardData, receipts, categoryHistory] = await Promise.all([
    getMarketDashboardData(month),
    getMarketReceipts(month),
    getMarketCategoryHistory(month, 3),
  ]);

  return {
    dashboardData,
    receipts,
    categoryHistory
  };
}
