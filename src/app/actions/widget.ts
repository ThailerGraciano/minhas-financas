"use server";

import { getDefaultCompetencyMonth } from "@/lib/date-utils";
import { getBudgetData } from "./budgets";
import { getBalanceEvolutionData, getBalancesByType, getDashboardData } from "./dashboard";
import { getSettings } from "./settings";

export async function getWidgetFullData(month?: string) {
  const settingsData = await getSettings();
  const targetMonth = month || getDefaultCompetencyMonth(settingsData.closingDay);

  const [dashboardData, balancesData] = await Promise.all([
    getDashboardData(targetMonth, "due_date"),
    getBalancesByType(),
  ]);

  const [evolutionData, budgetData] = await Promise.all([
    getBalanceEvolutionData(),
    getBudgetData(targetMonth),
  ]);

  return {
    month: targetMonth,
    closingDay: settingsData.closingDay,
    dashboardData,
    balancesData,
    evolutionData,
    budgetData,
  };
}

