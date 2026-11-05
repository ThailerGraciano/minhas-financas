'use server';

import { 
  getMarketCategoryHistory, 
  getMarketDashboardDataFromReceipts, 
  getMarketReceipts 
} from './market';

export async function getMarketFullData(month: string) {
  // Busca os receipts uma única vez para o mês de competência
  const receipts = await getMarketReceipts(month);

  // Reaproveita os receipts já carregados para montar o dashboard
  // e busca o histórico em paralelo sem refazer consultas redundantes de receipts
  const [dashboardData, categoryHistory] = await Promise.all([
    getMarketDashboardDataFromReceipts(receipts),
    getMarketCategoryHistory(month, 3),
  ]);

  return {
    dashboardData,
    receipts,
    categoryHistory
  };
}
