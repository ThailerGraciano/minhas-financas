'use server';

import { 
  getDashboardData, 
  getBalancesByType, 
  getBalanceEvolutionData, 
  getInstallmentsChartData, 
  getIncomeVsExpenseData, 
  getExpenseTreemapData 
} from './dashboard';

export async function getDashboardFullData(month: string) {
  const [data, balancesData, evolutionData, installmentsData, incomeVsExpenseData, treemapData] = await Promise.all([
    getDashboardData(month),
    getBalancesByType(),
    getBalanceEvolutionData(),
    getInstallmentsChartData(),
    getIncomeVsExpenseData(month),
    getExpenseTreemapData(month),
  ]);

  return {
    data,
    balancesData,
    evolutionData,
    installmentsData,
    incomeVsExpenseData,
    treemapData
  };
}
