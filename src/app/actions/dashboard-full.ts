'use server';

import { 
  getDashboardData, 
  getBalancesByType, 
  getBalanceEvolutionData, 
  getInstallmentsChartData, 
  getIncomeVsExpenseData, 
  getExpenseTreemapData,
  getExpensesForecastData,
  getCategoryForecastData
} from './dashboard';

export async function getDashboardFullData(month: string) {
  // Executando as consultas sequencialmente para evitar sobrecarregar o pool de conexões (Supabase/Postgres)
  // que estava gerando erros de "Failed query" por excesso de concorrência.
  const data = await getDashboardData(month);
  const balancesData = await getBalancesByType();
  const evolutionData = await getBalanceEvolutionData();
  const installmentsData = await getInstallmentsChartData();
  const incomeVsExpenseData = await getIncomeVsExpenseData(month);
  const treemapData = await getExpenseTreemapData(month);
  const forecastData = await getExpensesForecastData();
  const categoryForecastData = await getCategoryForecastData();

  return {
    data,
    balancesData,
    evolutionData,
    installmentsData,
    incomeVsExpenseData,
    treemapData,
    forecastData,
    categoryForecastData
  };
}
