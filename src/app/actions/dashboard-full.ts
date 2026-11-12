"use server";

import {
  getBalanceEvolutionData,
  getBalancesByType,
  getCategoryForecastData,
  getDashboardData,
  getExpenseTreemapData,
  getExpensesForecastData,
  getIncomeTreemapData,
  getInstallmentsChartData,
} from "./dashboard";

export async function getDashboardFullData(month: string, dateMode: "due_date" | "launch_date" = "due_date") {
  // Executando em lotes (batches) para melhorar a performance em relação à execução 100% sequencial,
  // mas sem sobrecarregar o pool de conexões (Supabase/Postgres) como um Promise.all único faria.

  // Lote 1: Dados críticos / visão geral
  const [data, balancesData, evolutionData] = await Promise.all([
    getDashboardData(month, dateMode),
    getBalancesByType(),
    getBalanceEvolutionData(),
  ]);

  // Lote 2: Gráficos e agrupamentos
  const [installmentsData, treemapData, incomeTreemapData] = await Promise.all([
    getInstallmentsChartData(),
    getExpenseTreemapData(month, dateMode),
    getIncomeTreemapData(month, dateMode),
  ]);

  // Lote 3: Previsões e estimativas
  const [forecastData, categoryForecastData] = await Promise.all([
    getExpensesForecastData(),
    getCategoryForecastData(),
  ]);

  return {
    data,
    balancesData,
    evolutionData,
    installmentsData,
    treemapData,
    incomeTreemapData,
    forecastData,
    categoryForecastData,
  };
}
