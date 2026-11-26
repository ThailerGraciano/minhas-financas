import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CLASSIFICATION_SOURCES,
  CONSUMPTION_NATURES,
  DEFAULT_CONSUMPTION_NATURES,
  isClassificationSource,
  isConsumptionNature,
  isDefaultConsumptionNature,
  type ClassificationSource,
  type ConsumptionNature,
  type DefaultConsumptionNature,
} from "./consumption-types";

export {
  CLASSIFICATION_SOURCES,
  CONSUMPTION_NATURES,
  DEFAULT_CONSUMPTION_NATURES,
  isClassificationSource,
  isConsumptionNature,
  isDefaultConsumptionNature,
};
export type { ClassificationSource, ConsumptionNature, DefaultConsumptionNature };

export type PerformanceStatus =
  | "within_expected"
  | "attention"
  | "above_expected"
  | "well_above_expected"
  | "insufficient_data"
  | "future";

export type ConfidenceLevel = "high" | "medium" | "low" | "insufficient";

export type HistoricalTrend = "increasing" | "decreasing" | "stable" | "insufficient_data";

export type WeekTemporalState = "completed" | "in_progress" | "future";

export type ReferenceSource = "history" | "provisional_budget" | "none";

export interface CompetencyWeekWindow {
  weekNumber: 1 | 2 | 3 | 4 | 5;
  label: string;
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  dayInCycleStart: number;
  dayInCycleEnd: number;
  state: WeekTemporalState;
  elapsedDays: number;
  isPartial: boolean;
}

export interface CompetencyCycleInfo {
  competencyMonth: string;
  label: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  weeks: CompetencyWeekWindow[];
}

export interface RawConsumptionTransaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  launchDate: string;
  dueDate: string;
  status: string;
  isFixed: boolean;
  fixedTransactionId: string | null;
  loanId: string | null;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  installmentParentId: number | null;
  parentTransactionId: number | null;
  creditCardId: number | null;
  accountId: number | null;
  accountType: string | null;
  accountName: string | null;
  creditCardName: string | null;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryDefaultNature: DefaultConsumptionNature | null;
  subcategoryId: number | null;
  subcategoryName: string | null;
  subcategoryDefaultNature: DefaultConsumptionNature | null;
  persistedNature: ConsumptionNature | null;
  persistedSource: ClassificationSource | null;
}

export interface ManualClassificationHistoryEntry {
  id: number;
  description: string;
  categoryId: number;
  subcategoryId: number | null;
  nature: ConsumptionNature;
  installmentParentId: number | null;
  parentTransactionId: number | null;
  installmentTotal: number | null;
  type: string;
  creditCardId: number | null;
  accountId: number | null;
}

export interface ClassifiedTransaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  launchDate: string;
  dueDate: string;
  status: string;
  isFixed: boolean;
  fixedTransactionId: string | null;
  loanId: string | null;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  installmentParentId: number | null;
  parentTransactionId: number | null;
  creditCardId: number | null;
  accountId: number | null;
  accountName: string | null;
  creditCardName: string | null;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  subcategoryId: number | null;
  subcategoryName: string | null;
  effectiveNature: ConsumptionNature;
  effectiveSource: ClassificationSource;
  classificationReason: string;
  isAnomalyWarning: boolean;
  includedInConsumption: boolean;
  isRefund: boolean;
  installmentGroupKey: string | null;
  competencyMonthByLaunch: string;
  weekNumber: 1 | 2 | 3 | 4 | 5;
  dayOfWeekIndex: number;
}

export interface WeeklyHistoricalMonthPoint {
  month: string;
  label: string;
  fullAmount: number;
  toDateAmount: number;
  isValid: boolean;
}

export interface WeeklyConsumptionPoint {
  weekNumber: 1 | 2 | 3 | 4 | 5;
  label: string;
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
  state: WeekTemporalState;
  isPartial: boolean;
  elapsedDays: number;
  dayCount: number;
  actualToDate: number;
  committedRemaining: number;
  expectedToDateMean: number;
  expectedToDateStdDev: number;
  expectedFullMean: number;
  expectedFullStdDev: number;
  varianceBandLow: number;
  varianceBandHigh: number;
  projectedRemaining: number;
  projectedTotal: number;
  installmentActual: number;
  differenceAmount: number;
  differencePercent: number | null;
  status: PerformanceStatus;
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  validObservations: number;
  referenceSource: ReferenceSource;
  historicalBreakdown: WeeklyHistoricalMonthPoint[];
}

export interface CategoryConsumptionSummary {
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  defaultNature: DefaultConsumptionNature | null;
  weeklyHistoricalMean: number;
  expectedCompetencyTotal: number;
  expectedToDateTotal: number;
  realizedTotal: number;
  projectedClosing: number | null;
  variationAmount: number;
  variationPercent: number | null;
  monthlyBudget: number | null;
  budgetUsagePercent: number | null;
  status: PerformanceStatus;
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  validObservations: number;
  referenceSource: ReferenceSource;
  weeks: WeeklyConsumptionPoint[];
}

export interface ClosingScenarios {
  hasStatisticalBasis: boolean;
  referenceSource: ReferenceSource;
  optimistic: number | null;
  probable: number | null;
  pessimistic: number | null;
  explanation: string;
}

export interface HistoricalCompetencyPoint {
  month: string;
  label: string;
  isTarget: boolean;
  hasValidData: boolean;
  totalRecurring: number;
  projectedRecurring: number | null;
  installmentTotal: number;
  fixedTotal: number;
  extraordinaryTotal: number;
  transactionCount: number;
}

export interface ExcludedTotalsSummary {
  installment: number;
  installmentCount: number;
  fixed: number;
  extraordinary: number;
  financialMovement: number;
  individualWithdrawal: number;
  unclassified: number;
  unclassifiedCount: number;
}

export interface InstallmentsSummary {
  currentTotal: number;
  currentCount: number;
  historicalMean: number;
  validBaselineCount: number;
  differenceAmount: number | null;
  differencePercent: number | null;
  byWeek: Array<{
    weekNumber: 1 | 2 | 3 | 4 | 5;
    label: string;
    amount: number;
    count: number;
  }>;
}

export interface ConsumptionIntelligenceResult {
  competencyMonth: string;
  competencyLabel: string;
  closingDay: number;
  cycleStartDate: string;
  cycleEndDate: string;
  referenceToday: string;
  summary: {
    expectedCompetencyTotal: number;
    expectedToDateTotal: number;
    realizedTotal: number;
    projectedClosing: number | null;
    differenceVsHistoryAmount: number | null;
    differenceVsHistoryPercent: number | null;
    recurringBudgetTotal: number | null;
    budgetConsumptionPercent: number | null;
    overallStatus: PerformanceStatus;
    overallConfidence: ConfidenceLevel;
    confidenceReasons: string[];
    validBaselineCount: number;
    referenceSource: ReferenceSource;
    excludedTotals: ExcludedTotalsSummary;
  };
  currentWeek: WeeklyConsumptionPoint | null;
  weeks: WeeklyConsumptionPoint[];
  installmentsSummary: InstallmentsSummary;
  scenarios: ClosingScenarios;
  categories: CategoryConsumptionSummary[];
  historicalEvolution: {
    months: HistoricalCompetencyPoint[];
    trend: HistoricalTrend;
    trendPercent: number | null;
    validBaselineMonths: string[];
  };
  auditTransactions: ClassifiedTransaction[];
}

export interface ComputeConsumptionIntelligenceInput {
  targetMonth: string;
  closingDay: number;
  referenceToday: string;
  transactions: RawConsumptionTransaction[];
  manualHistory: ManualClassificationHistoryEntry[];
  categoryBudgets: Map<number, number>;
  categoryCatalog?: Array<{
    id: number;
    name: string;
    icon: string;
    defaultNature: DefaultConsumptionNature | null;
  }>;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Converte string YYYY-MM-DD para Date ao meio-dia local, evitando desvios de fuso horário UTC.
 */
export function parseDateOnly(dateStr: string): Date {
  const clean = dateStr.slice(0, 10);
  const [yearStr, monthStr, dayStr] = clean.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function formatDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatMonthShortLabel(monthStr: string): string {
  const date = parseDateOnly(`${monthStr}-01`);
  const raw = format(date, "MMM/yy", { locale: ptBR }).replace(".", "");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatMonthFullLabel(monthStr: string): string {
  const date = parseDateOnly(`${monthStr}-01`);
  const raw = format(date, "MMMM/yyyy", { locale: ptBR });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Normaliza texto para comparação determinística (sem acentos, minúsculo, espaços colapsados).
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Remove sufixos de parcelamento e direção de transferência para agrupar lançamentos equivalentes.
 */
export function cleanBaseDescription(description: string): string {
  return description
    .replace(/\s*\((Saída|Entrada|Saida)\)/gi, "")
    .replace(/\s*\(\s*\d{1,3}\s*\/\s*\d{1,3}\s*\)/g, "")
    .replace(/\s+\d{1,3}\/\d{1,3}\s*$/g, "")
    .trim();
}

export function extractInstallmentInfo(tx: {
  description: string;
  installmentCurrent?: number | null;
  installmentTotal: number | null;
}): { current: number | null; total: number | null } {
  if (tx.installmentTotal && tx.installmentTotal > 1) {
    return {
      current: tx.installmentCurrent ?? null,
      total: tx.installmentTotal,
    };
  }
  const cleanDesc = tx.description.replace(/\s*\((Saída|Entrada|Saida)\)/gi, "").trim();
  const parenMatch = cleanDesc.match(/\((\d{1,3})\s*\/\s*(\d{1,3})\)/);
  if (parenMatch) {
    const current = parseInt(parenMatch[1], 10);
    const total = parseInt(parenMatch[2], 10);
    if (total > 1) return { current, total };
  }
  const tailMatch = cleanDesc.match(/\s+(\d{1,3})\/(\d{1,3})\s*$/);
  if (tailMatch) {
    const current = parseInt(tailMatch[1], 10);
    const total = parseInt(tailMatch[2], 10);
    if (total > 1 && current >= 1 && current <= total) return { current, total };
  }
  return { current: tx.installmentCurrent ?? null, total: tx.installmentTotal };
}

export function resolveInstallmentGroupKeys(tx: {
  id: number;
  type: string;
  description: string;
  installmentCurrent?: number | null;
  installmentTotal: number | null;
  installmentParentId: number | null;
  parentTransactionId: number | null;
  creditCardId: number | null;
  accountId: number | null;
}): { primaryKey: string | null; legacyKey: string | null } {
  const info = extractInstallmentInfo(tx);
  const isInstallment = Boolean((info.total && info.total > 1) || tx.installmentParentId);
  if (!isInstallment) {
    return { primaryKey: null, legacyKey: null };
  }

  let primaryKey: string | null = null;
  if (tx.installmentParentId) {
    primaryKey = `root:${tx.installmentParentId}`;
  } else if (tx.type !== "transfer" && tx.parentTransactionId) {
    primaryKey = `root:${tx.parentTransactionId}`;
  } else if (tx.id > 0) {
    primaryKey = `root:${tx.id}`;
  }

  const baseNorm = normalizeText(cleanBaseDescription(tx.description));
  const legacyKey =
    info.total && info.total > 1 && baseNorm
      ? `legacy:${tx.type}:${tx.creditCardId ?? tx.accountId ?? 0}:${info.total}:${baseNorm}`
      : null;

  return { primaryKey, legacyKey };
}

/**
 * Calcula o ciclo financeiro da competência e divide nas Semanas 1 a 5 (dias relativos do ciclo).
 */
export function getCompetencyCycle(
  competencyMonth: string,
  closingDay: number,
  referenceToday?: string,
): CompetencyCycleInfo {
  const safeClosingDay = Math.min(Math.max(1, closingDay), 31);
  const currMonthDate = parseDateOnly(`${competencyMonth}-01`);
  const prevMonthDate = subMonths(currMonthDate, 1);

  const prevEndDay = Math.min(safeClosingDay, endOfMonth(prevMonthDate).getDate());
  const currEndDay = Math.min(safeClosingDay, endOfMonth(currMonthDate).getDate());

  const prevEndDate = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), prevEndDay, 12, 0, 0);
  const cycleStart = addDays(prevEndDate, 1);
  const cycleEnd = new Date(currMonthDate.getFullYear(), currMonthDate.getMonth(), currEndDay, 12, 0, 0);
  const totalDays = differenceInCalendarDays(cycleEnd, cycleStart) + 1;

  const weekRanges: Array<{ weekNumber: 1 | 2 | 3 | 4 | 5; startIdx: number; endIdx: number }> = [
    { weekNumber: 1, startIdx: 1, endIdx: Math.min(7, totalDays) },
    { weekNumber: 2, startIdx: 8, endIdx: Math.min(14, totalDays) },
    { weekNumber: 3, startIdx: 15, endIdx: Math.min(21, totalDays) },
    { weekNumber: 4, startIdx: 22, endIdx: Math.min(28, totalDays) },
  ];

  if (totalDays >= 29) {
    weekRanges.push({ weekNumber: 5, startIdx: 29, endIdx: totalDays });
  }

  const todayDate = referenceToday ? parseDateOnly(referenceToday) : null;
  const todayStr = todayDate ? formatDateOnly(todayDate) : null;

  const weeks: CompetencyWeekWindow[] = weekRanges
    .filter((range) => range.startIdx <= totalDays)
    .map((range) => {
      const startDateObj = addDays(cycleStart, range.startIdx - 1);
      const endDateObj = addDays(cycleStart, range.endIdx - 1);
      const startDate = formatDateOnly(startDateObj);
      const endDate = formatDateOnly(endDateObj);
      const dayCount = range.endIdx - range.startIdx + 1;

      let state: WeekTemporalState = "completed";
      let elapsedDays = dayCount;
      let isPartial = false;

      if (todayStr && todayDate) {
        if (todayStr < startDate) {
          state = "future";
          elapsedDays = 0;
          isPartial = false;
        } else if (todayStr > endDate) {
          state = "completed";
          elapsedDays = dayCount;
          isPartial = false;
        } else {
          state = "in_progress";
          elapsedDays = Math.min(dayCount, Math.max(1, differenceInCalendarDays(todayDate, startDateObj) + 1));
          isPartial = elapsedDays < dayCount;
        }
      }

      return {
        weekNumber: range.weekNumber,
        label: `Sem ${range.weekNumber}`,
        dateRangeLabel: `${format(startDateObj, "dd/MM")}–${format(endDateObj, "dd/MM")}`,
        startDate,
        endDate,
        dayCount,
        dayInCycleStart: range.startIdx,
        dayInCycleEnd: range.endIdx,
        state,
        elapsedDays,
        isPartial,
      };
    });

  return {
    competencyMonth,
    label: formatMonthFullLabel(competencyMonth),
    startDate: formatDateOnly(cycleStart),
    endDate: formatDateOnly(cycleEnd),
    totalDays,
    weeks,
  };
}

/**
 * Localiza a qual competência e semana (1..5) pertence uma data de lançamento (launch_date).
 */
export function resolveCycleAndWeekForDate(
  launchDateStr: string,
  cycles: CompetencyCycleInfo[],
): { cycle: CompetencyCycleInfo; week: CompetencyWeekWindow; dayOfWeekIndex: number } | null {
  const cleanDate = launchDateStr.slice(0, 10);
  for (const cycle of cycles) {
    if (cleanDate >= cycle.startDate && cleanDate <= cycle.endDate) {
      const targetDate = parseDateOnly(cleanDate);
      const cycleStart = parseDateOnly(cycle.startDate);
      const dayInCycle = differenceInCalendarDays(targetDate, cycleStart) + 1;
      for (const week of cycle.weeks) {
        if (dayInCycle >= week.dayInCycleStart && dayInCycle <= week.dayInCycleEnd) {
          return {
            cycle,
            week,
            dayOfWeekIndex: dayInCycle - week.dayInCycleStart + 1,
          };
        }
      }
    }
  }
  return null;
}

const INVOICE_MOVEMENT_KEYWORDS = [
  "pagamento de fatura",
  "adiantamento de fatura",
  "ajuste de fatura",
  "pgto fatura",
  "fatura cartao",
  "estorno fatura",
] as const;

function matchesKeyword(haystack: string, keywords: readonly string[]): string | null {
  for (const kw of keywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`);
    if (regex.test(haystack)) {
      return kw;
    }
  }
  return null;
}

export function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

interface InstallmentGroupClassification {
  nature: ConsumptionNature;
  source: ClassificationSource;
}

function buildClassifierContext(
  allTransactions: RawConsumptionTransaction[],
  manualHistory: ManualClassificationHistoryEntry[],
) {
  // Mapa de classificação de grupos parcelados (prioridade: manual > inherited_installment)
  const installmentGroups = new Map<string, InstallmentGroupClassification>();

  const registerGroup = (
    keys: { primaryKey: string | null; legacyKey: string | null },
    nature: ConsumptionNature,
    source: ClassificationSource,
  ) => {
    const incomingPriority = source === "manual" ? 2 : 1;
    for (const key of [keys.primaryKey, keys.legacyKey]) {
      if (!key) continue;
      const existing = installmentGroups.get(key);
      const existingPriority = existing ? (existing.source === "manual" ? 2 : 1) : 0;
      if (!existing || incomingPriority >= existingPriority) {
        installmentGroups.set(key, { nature, source });
      }
    }
  };

  for (const entry of manualHistory) {
    const keys = resolveInstallmentGroupKeys(entry);
    if (keys.primaryKey || keys.legacyKey) {
      registerGroup(keys, entry.nature, "manual");
    }
  }

  for (const tx of allTransactions) {
    if (tx.persistedNature && (tx.persistedSource === "manual" || tx.persistedSource === "inherited_installment")) {
      const keys = resolveInstallmentGroupKeys(tx);
      if (keys.primaryKey || keys.legacyKey) {
        registerGroup(keys, tx.persistedNature, tx.persistedSource);
      }
    }
  }

  return {
    installmentGroups,
  };
}

function classifySingleTransaction(
  tx: RawConsumptionTransaction,
  ctx: ReturnType<typeof buildClassifierContext>,
): {
  effectiveNature: ConsumptionNature;
  effectiveSource: ClassificationSource;
  classificationReason: string;
  isAnomalyWarning: boolean;
  installmentGroupKey: string | null;
} {
  const instInfo = extractInstallmentInfo(tx);
  const isInstallment = Boolean((instInfo.total && instInfo.total > 1) || tx.installmentParentId);
  const groupKeys = resolveInstallmentGroupKeys(tx);
  const groupKey = groupKeys.primaryKey ?? groupKeys.legacyKey;

  const descNorm = normalizeText(cleanBaseDescription(tx.description));
  const catNorm = normalizeText(tx.categoryName);
  const subNorm = tx.subcategoryName ? normalizeText(tx.subcategoryName) : "";
  const combinedNorm = [catNorm, subNorm, descNorm].filter(Boolean).join(" ");

  // 1. Classificação manual explícita no próprio lançamento tem prioridade máxima
  if (tx.persistedNature && tx.persistedSource === "manual") {
    return {
      effectiveNature: tx.persistedNature,
      effectiveSource: "manual",
      classificationReason: "Classificação manual definida pelo usuário.",
      isAnomalyWarning: false,
      installmentGroupKey: groupKey,
    };
  }

  // 2. Classificação herdada de outra parcela da mesma operação
  if (isInstallment) {
    const inherited =
      (groupKeys.primaryKey ? ctx.installmentGroups.get(groupKeys.primaryKey) : undefined) ??
      (groupKeys.legacyKey ? ctx.installmentGroups.get(groupKeys.legacyKey) : undefined);

    if (inherited) {
      return {
        effectiveNature: inherited.nature,
        effectiveSource: "inherited_installment",
        classificationReason: "Classificação herdada da compra parcelada vinculada.",
        isAnomalyWarning: false,
        installmentGroupKey: groupKey,
      };
    }

    if (tx.persistedNature && tx.persistedSource === "inherited_installment") {
      return {
        effectiveNature: tx.persistedNature,
        effectiveSource: "inherited_installment",
        classificationReason: "Classificação herdada do grupo de parcelas.",
        isAnomalyWarning: false,
        installmentGroupKey: groupKey,
      };
    }
  }

  // 3. Proteções estruturais de movimentação financeira (transferências, empréstimos e faturas)
  if (tx.type === "transfer") {
    return {
      effectiveNature: "financial_movement",
      effectiveSource: "auto",
      classificationReason: "Transferência entre contas ou pagamento de fatura.",
      isAnomalyWarning: false,
      installmentGroupKey: groupKey,
    };
  }

  if (tx.loanId) {
    return {
      effectiveNature: "financial_movement",
      effectiveSource: "auto",
      classificationReason: "Movimentação vinculada a empréstimo.",
      isAnomalyWarning: false,
      installmentGroupKey: groupKey,
    };
  }

  const matchedInvoiceMove =
    matchesKeyword(catNorm, INVOICE_MOVEMENT_KEYWORDS) ?? matchesKeyword(combinedNorm, INVOICE_MOVEMENT_KEYWORDS);
  if (matchedInvoiceMove) {
    return {
      effectiveNature: "financial_movement",
      effectiveSource: "auto",
      classificationReason: `Movimentação de fatura ("${matchedInvoiceMove}").`,
      isAnomalyWarning: false,
      installmentGroupKey: groupKey,
    };
  }

  // 4. Compras parceladas tratadas separadamente do consumo variável semanal
  if (isInstallment) {
    return {
      effectiveNature: "installment",
      effectiveSource: "auto",
      classificationReason: "Compra parcelada — acompanhada separadamente do consumo variável.",
      isAnomalyWarning: false,
      installmentGroupKey: groupKey,
    };
  }

  // 5. Hierarquia Subcategoria -> Categoria pai (inclusive para despesas fixas, ex.: streaming)
  if (tx.subcategoryDefaultNature) {
    return {
      effectiveNature: tx.subcategoryDefaultNature,
      effectiveSource: "auto",
      classificationReason: `Definida pela subcategoria (${tx.subcategoryName ?? "Subcategoria"}).`,
      isAnomalyWarning: false,
      installmentGroupKey: groupKey,
    };
  }

  if (tx.categoryDefaultNature) {
    return {
      effectiveNature: tx.categoryDefaultNature,
      effectiveSource: "auto",
      classificationReason: `Herdada da categoria (${tx.categoryName}).`,
      isAnomalyWarning: false,
      installmentGroupKey: groupKey,
    };
  }

  // 6. Padrão: Não definido (não contamina o consumo até configurar categoria/subcategoria)
  return {
    effectiveNature: "unclassified",
    effectiveSource: "auto",
    classificationReason: "Categoria e subcategoria sem natureza definida — configure em Categorias.",
    isAnomalyWarning: false,
    installmentGroupKey: groupKey,
  };
}

export function classifyPerformanceStatus(
  actual: number,
  expectedMean: number,
  expectedStdDev: number,
  validObservations: number,
  state: WeekTemporalState,
): PerformanceStatus {
  if (state === "future") return "future";
  if (validObservations === 0) return "insufficient_data";

  const effectiveStd = Math.max(expectedStdDev, expectedMean * 0.12, 15);

  if (actual <= expectedMean + 0.5 * effectiveStd) {
    return "within_expected";
  }
  if (actual <= expectedMean + 1.0 * effectiveStd) {
    return "attention";
  }
  if (actual <= expectedMean + 2.0 * effectiveStd) {
    return "above_expected";
  }
  return "well_above_expected";
}

export function computeConfidence(params: {
  validObservations: number;
  historicalValues: number[];
  mean: number;
  stdDev: number;
  isProvisionalBudget?: boolean;
}): { level: ConfidenceLevel; reasons: string[] } {
  const { validObservations, historicalValues, mean, stdDev, isProvisionalBudget } = params;
  const reasons: string[] = [];

  if (validObservations === 0) {
    reasons.push(
      isProvisionalBudget
        ? "Sem histórico suficiente; utilizando orçamento como referência provisória."
        : "Sem competências anteriores com dados válidos.",
    );
    return { level: "insufficient", reasons };
  }

  if (validObservations === 1) {
    reasons.push("Baseada em apenas 1 competência anterior.");
  } else if (validObservations === 2) {
    reasons.push("Baseada em 2 de 3 competências anteriores.");
  } else {
    reasons.push("Baseada nas 3 competências anteriores.");
  }

  const cv = mean > 0 ? stdDev / mean : 0;
  if (validObservations >= 2) {
    if (cv > 0.45) {
      reasons.push("Alta oscilação nos valores históricos.");
    } else if (cv > 0.25) {
      reasons.push("Oscilação moderada entre competências.");
    }
  }

  let hasOutlier = false;
  if (historicalValues.length === 3 && mean > 0) {
    const sorted = [...historicalValues].sort((a, b) => a - b);
    const medianVal = sorted[1];
    if (medianVal > 0 && (sorted[2] > medianVal * 2 || sorted[0] < medianVal * 0.35)) {
      hasOutlier = true;
      reasons.push("Presença de valor atípico em uma das competências.");
    }
  }

  let hasRecentShift = false;
  if (historicalValues.length >= 2) {
    const latest = historicalValues[historicalValues.length - 1];
    const priorMean =
      historicalValues.slice(0, -1).reduce((acc, v) => acc + v, 0) / (historicalValues.length - 1);
    if (priorMean > 0 && Math.abs(latest - priorMean) / priorMean > 0.35) {
      hasRecentShift = true;
      reasons.push("Mudança recente de comportamento na última competência.");
    }
  }

  if (validObservations === 1) {
    return { level: "low", reasons };
  }

  if (validObservations === 2) {
    if (cv > 0.45) {
      return { level: "low", reasons };
    }
    return { level: "medium", reasons };
  }

  // validObservations >= 3
  if (cv > 0.5 || (hasOutlier && hasRecentShift)) {
    return { level: "low", reasons };
  }
  if (cv > 0.25 || hasOutlier || hasRecentShift) {
    return { level: "medium", reasons };
  }

  return { level: "high", reasons };
}

function buildWeeklyAnalysis(params: {
  targetCycle: CompetencyCycleInfo;
  baselineCycles: CompetencyCycleInfo[];
  validBaselineMonths: string[];
  targetTxs: ClassifiedTransaction[];
  baselineTxsByMonth: Map<string, ClassifiedTransaction[]>;
  monthlyProvisionalBudget: number | null;
}): {
  weeks: WeeklyConsumptionPoint[];
  expectedCompetencyTotal: number;
  expectedToDateTotal: number;
  realizedTotal: number;
  committedRemainingTotal: number;
  remainingMeanTotal: number;
  empiricalRemainingStdDev: number;
  summedWeeklyRemainingStdDev: number;
  hasObservedData: boolean;
} {
  const {
    targetCycle,
    baselineCycles,
    validBaselineMonths,
    targetTxs,
    baselineTxsByMonth,
    monthlyProvisionalBudget,
  } = params;

  const validSet = new Set(validBaselineMonths);
  const validCycles = baselineCycles.filter((c) => validSet.has(c.competencyMonth));

  const weeks: WeeklyConsumptionPoint[] = [];
  const perMonthRemainingTotals = new Map<string, number>();
  for (const c of validCycles) {
    perMonthRemainingTotals.set(c.competencyMonth, 0);
  }

  let expectedCompetencyTotal = 0;
  let expectedToDateTotal = 0;
  let realizedTotal = 0;
  let committedRemainingTotal = 0;
  let remainingMeanTotal = 0;
  let remainingVarianceSum = 0;

  for (const targetWeek of targetCycle.weeks) {
    const weekTxs = targetTxs.filter((t) => t.includedInConsumption && t.weekNumber === targetWeek.weekNumber);
    const installmentActual = roundCurrency(
      targetTxs
        .filter((t) => t.effectiveNature === "installment" && t.weekNumber === targetWeek.weekNumber)
        .reduce((acc, t) => acc + t.amount, 0),
    );

    const compareCutoffDay =
      targetWeek.state === "future"
        ? 0
        : targetWeek.state === "in_progress"
          ? targetWeek.elapsedDays
          : targetWeek.dayCount;

    const actualToDate = roundCurrency(
      weekTxs.filter((t) => t.dayOfWeekIndex <= compareCutoffDay).reduce((acc, t) => acc + t.amount, 0),
    );
    const committedRemaining = roundCurrency(
      weekTxs.filter((t) => t.dayOfWeekIndex > compareCutoffDay).reduce((acc, t) => acc + t.amount, 0),
    );

    const historicalBreakdown: WeeklyHistoricalMonthPoint[] = [];
    const toDateSamples: number[] = [];
    const fullSamples: number[] = [];
    const remainingSamples: number[] = [];

    for (const baseCycle of baselineCycles) {
      const baseWeek = baseCycle.weeks.find((w) => w.weekNumber === targetWeek.weekNumber);
      const isMonthValid = validSet.has(baseCycle.competencyMonth) && Boolean(baseWeek && baseWeek.dayCount > 0);
      const monthTxs = baselineTxsByMonth.get(baseCycle.competencyMonth) ?? [];
      const baseWeekTxs = monthTxs.filter(
        (t) => t.includedInConsumption && t.weekNumber === targetWeek.weekNumber,
      );

      // Compara o mesmo intervalo de dias (ex: dias 1..elapsedDays da semana)
      const fullCap = targetWeek.dayCount;
      const fullAmount = roundCurrency(
        baseWeekTxs.filter((t) => t.dayOfWeekIndex <= fullCap).reduce((acc, t) => acc + t.amount, 0),
      );
      const toDateCap = targetWeek.state === "future" ? fullCap : Math.max(0, compareCutoffDay);
      const toDateAmount = roundCurrency(
        baseWeekTxs.filter((t) => t.dayOfWeekIndex <= toDateCap).reduce((acc, t) => acc + t.amount, 0),
      );
      const remAmount =
        targetWeek.state === "completed"
          ? 0
          : targetWeek.state === "future"
            ? fullAmount
            : roundCurrency(
                baseWeekTxs
                  .filter((t) => t.dayOfWeekIndex > compareCutoffDay && t.dayOfWeekIndex <= fullCap)
                  .reduce((acc, t) => acc + t.amount, 0),
              );

      historicalBreakdown.push({
        month: baseCycle.competencyMonth,
        label: formatMonthShortLabel(baseCycle.competencyMonth),
        fullAmount,
        toDateAmount,
        isValid: isMonthValid,
      });

      if (isMonthValid) {
        toDateSamples.push(toDateAmount);
        fullSamples.push(fullAmount);
        remainingSamples.push(remAmount);
        perMonthRemainingTotals.set(
          baseCycle.competencyMonth,
          (perMonthRemainingTotals.get(baseCycle.competencyMonth) ?? 0) + remAmount,
        );
      }
    }

    const validObs = fullSamples.length;
    let referenceSource: ReferenceSource = "none";
    let expectedFullMean = 0;
    let expectedFullStdDev = 0;
    let expectedToDateMean = 0;
    let expectedToDateStdDev = 0;
    let historicalRemainingMean = 0;
    let historicalRemainingStdDev = 0;

    if (validObs > 0) {
      referenceSource = "history";
      expectedFullMean = roundCurrency(fullSamples.reduce((a, b) => a + b, 0) / validObs);
      expectedFullStdDev = roundCurrency(sampleStdDev(fullSamples));

      if (targetWeek.state === "future") {
        expectedToDateMean = 0;
        expectedToDateStdDev = 0;
        historicalRemainingMean = expectedFullMean;
        historicalRemainingStdDev = expectedFullStdDev;
      } else {
        expectedToDateMean = roundCurrency(toDateSamples.reduce((a, b) => a + b, 0) / validObs);
        expectedToDateStdDev = roundCurrency(sampleStdDev(toDateSamples));
        historicalRemainingMean = roundCurrency(remainingSamples.reduce((a, b) => a + b, 0) / validObs);
        historicalRemainingStdDev = roundCurrency(sampleStdDev(remainingSamples));
      }
    } else if (monthlyProvisionalBudget && monthlyProvisionalBudget > 0) {
      referenceSource = "provisional_budget";
      const weekShare = targetCycle.totalDays > 0 ? targetWeek.dayCount / targetCycle.totalDays : 0;
      expectedFullMean = roundCurrency(monthlyProvisionalBudget * weekShare);
      const elapsedShare =
        targetWeek.state === "future"
          ? 0
          : targetWeek.dayCount > 0
            ? compareCutoffDay / targetWeek.dayCount
            : 1;
      expectedToDateMean = roundCurrency(expectedFullMean * elapsedShare);
      historicalRemainingMean =
        targetWeek.state === "completed"
          ? 0
          : targetWeek.state === "future"
            ? expectedFullMean
            : roundCurrency(Math.max(0, expectedFullMean - expectedToDateMean));
    }

    const projectedRemaining =
      targetWeek.state === "completed"
        ? 0
        : roundCurrency(Math.max(historicalRemainingMean, committedRemaining));
    const projectedTotal = roundCurrency(actualToDate + projectedRemaining);

    const compareReference =
      targetWeek.state === "future" ? 0 : expectedToDateMean;
    const compareStdDev =
      targetWeek.state === "future" ? 0 : expectedToDateStdDev;

    const differenceAmount =
      referenceSource === "none" || targetWeek.state === "future"
        ? 0
        : roundCurrency(actualToDate - compareReference);
    const differencePercent =
      referenceSource !== "none" && targetWeek.state !== "future" && compareReference > 0
        ? roundCurrency(((actualToDate - compareReference) / compareReference) * 100)
        : null;

    const status = classifyPerformanceStatus(
      actualToDate,
      compareReference,
      compareStdDev,
      referenceSource === "history" ? validObs : 0,
      targetWeek.state,
    );

    const conf = computeConfidence({
      validObservations: validObs,
      historicalValues: targetWeek.state === "in_progress" ? toDateSamples : fullSamples,
      mean: compareReference,
      stdDev: compareStdDev,
      isProvisionalBudget: referenceSource === "provisional_budget",
    });

    const bandHalfWidth =
      validObs >= 2
        ? Math.max(expectedFullStdDev, expectedFullMean * 0.1)
        : validObs === 1
          ? expectedFullMean * 0.15
          : 0;

    const varianceBandLow =
      referenceSource === "history" ? roundCurrency(Math.max(0, expectedFullMean - bandHalfWidth)) : 0;
    const varianceBandHigh =
      referenceSource === "history" ? roundCurrency(expectedFullMean + bandHalfWidth) : 0;

    weeks.push({
      weekNumber: targetWeek.weekNumber,
      label: targetWeek.label,
      dateRangeLabel: targetWeek.dateRangeLabel,
      startDate: targetWeek.startDate,
      endDate: targetWeek.endDate,
      state: targetWeek.state,
      isPartial: targetWeek.isPartial,
      elapsedDays: targetWeek.elapsedDays,
      dayCount: targetWeek.dayCount,
      actualToDate,
      committedRemaining,
      expectedToDateMean,
      expectedToDateStdDev,
      expectedFullMean,
      expectedFullStdDev,
      varianceBandLow,
      varianceBandHigh,
      projectedRemaining,
      projectedTotal,
      installmentActual,
      differenceAmount,
      differencePercent,
      status,
      confidence: conf.level,
      confidenceReasons: conf.reasons,
      validObservations: validObs,
      referenceSource,
      historicalBreakdown,
    });

    expectedCompetencyTotal += expectedFullMean;
    if (targetWeek.state !== "future") {
      expectedToDateTotal += expectedToDateMean;
    }
    realizedTotal += actualToDate;
    committedRemainingTotal += committedRemaining;
    remainingMeanTotal += projectedRemaining;
    remainingVarianceSum += historicalRemainingStdDev ** 2;
  }

  const remainingMonthValues = Array.from(perMonthRemainingTotals.values());
  const empiricalRemainingStdDev = roundCurrency(sampleStdDev(remainingMonthValues));
  const summedWeeklyRemainingStdDev = roundCurrency(Math.sqrt(remainingVarianceSum));

  return {
    weeks,
    expectedCompetencyTotal: roundCurrency(expectedCompetencyTotal),
    expectedToDateTotal: roundCurrency(expectedToDateTotal),
    realizedTotal: roundCurrency(realizedTotal),
    committedRemainingTotal: roundCurrency(committedRemainingTotal),
    remainingMeanTotal: roundCurrency(remainingMeanTotal),
    empiricalRemainingStdDev,
    summedWeeklyRemainingStdDev,
    hasObservedData: validCycles.length > 0,
  };
}

/**
 * Motor determinístico principal da Inteligência de Consumo Semanal.
 * Puramente funcional, auditável e independente do fluxo de caixa (sempre usa launch_date).
 */
export function computeConsumptionIntelligence(
  input: ComputeConsumptionIntelligenceInput,
): ConsumptionIntelligenceResult {
  const {
    targetMonth,
    closingDay,
    referenceToday,
    transactions,
    manualHistory,
    categoryBudgets,
    categoryCatalog = [],
  } = input;

  const targetMonthDate = parseDateOnly(`${targetMonth}-01`);
  const baselineMonths = [3, 2, 1].map((offset) => format(subMonths(targetMonthDate, offset), "yyyy-MM"));

  const baselineCycles = baselineMonths.map((m) => getCompetencyCycle(m, closingDay));
  const targetCycle = getCompetencyCycle(targetMonth, closingDay, referenceToday);
  const allCycles = [...baselineCycles, targetCycle];

  const classifierCtx = buildClassifierContext(transactions, manualHistory);

  const classifiedByMonth = new Map<string, ClassifiedTransaction[]>();
  for (const cycle of allCycles) {
    classifiedByMonth.set(cycle.competencyMonth, []);
  }

  for (const tx of transactions) {
    if (tx.type === "income" || tx.status === "ignored") continue;

    const resolvedDate = resolveCycleAndWeekForDate(tx.launchDate, allCycles);
    if (!resolvedDate) continue;

    const classification = classifySingleTransaction(tx, classifierCtx);
    const includedInConsumption = classification.effectiveNature === "recurring";
    const isRefund = tx.amount < 0 && includedInConsumption;

    const item: ClassifiedTransaction = {
      id: tx.id,
      type: tx.type,
      amount: roundCurrency(tx.amount),
      description: tx.description,
      launchDate: tx.launchDate.slice(0, 10),
      dueDate: tx.dueDate.slice(0, 10),
      status: tx.status,
      isFixed: tx.isFixed,
      fixedTransactionId: tx.fixedTransactionId,
      loanId: tx.loanId,
      installmentCurrent: tx.installmentCurrent,
      installmentTotal: tx.installmentTotal,
      installmentParentId: tx.installmentParentId,
      parentTransactionId: tx.parentTransactionId,
      creditCardId: tx.creditCardId,
      accountId: tx.accountId,
      accountName: tx.accountName,
      creditCardName: tx.creditCardName,
      categoryId: tx.categoryId,
      categoryName: tx.categoryName,
      categoryIcon: tx.categoryIcon,
      subcategoryId: tx.subcategoryId,
      subcategoryName: tx.subcategoryName,
      effectiveNature: classification.effectiveNature,
      effectiveSource: classification.effectiveSource,
      classificationReason: classification.classificationReason,
      isAnomalyWarning: classification.isAnomalyWarning,
      includedInConsumption,
      isRefund,
      installmentGroupKey: classification.installmentGroupKey,
      competencyMonthByLaunch: resolvedDate.cycle.competencyMonth,
      weekNumber: resolvedDate.week.weekNumber,
      dayOfWeekIndex: resolvedDate.dayOfWeekIndex,
    };

    classifiedByMonth.get(resolvedDate.cycle.competencyMonth)?.push(item);
  }

  // Competências de referência que possuem histórico válido de consumo recorrente
  const validBaselineMonths = baselineMonths.filter((m) => {
    const txs = classifiedByMonth.get(m) ?? [];
    return txs.some((t) => t.includedInConsumption);
  });

  const targetTxs = classifiedByMonth.get(targetMonth) ?? [];
  const baselineTxsByMonth = new Map<string, ClassifiedTransaction[]>();
  for (const m of baselineMonths) {
    baselineTxsByMonth.set(m, classifiedByMonth.get(m) ?? []);
  }

  // Totais excluídos da competência atual (transparência e auditoria)
  const excludedTotals: ExcludedTotalsSummary = {
    installment: 0,
    installmentCount: 0,
    fixed: 0,
    extraordinary: 0,
    financialMovement: 0,
    individualWithdrawal: 0,
    unclassified: 0,
    unclassifiedCount: 0,
  };

  for (const tx of targetTxs) {
    switch (tx.effectiveNature) {
      case "installment":
        excludedTotals.installment += tx.amount;
        excludedTotals.installmentCount += 1;
        break;
      case "fixed":
        excludedTotals.fixed += tx.amount;
        break;
      case "extraordinary":
        excludedTotals.extraordinary += tx.amount;
        break;
      case "financial_movement":
        excludedTotals.financialMovement += tx.amount;
        break;
      case "individual_withdrawal":
        excludedTotals.individualWithdrawal += tx.amount;
        break;
      case "unclassified":
        excludedTotals.unclassified += tx.amount;
        excludedTotals.unclassifiedCount += 1;
        break;
      case "recurring":
        break;
    }
  }
  excludedTotals.installment = roundCurrency(excludedTotals.installment);
  excludedTotals.fixed = roundCurrency(excludedTotals.fixed);
  excludedTotals.extraordinary = roundCurrency(excludedTotals.extraordinary);
  excludedTotals.financialMovement = roundCurrency(excludedTotals.financialMovement);
  excludedTotals.individualWithdrawal = roundCurrency(excludedTotals.individualWithdrawal);
  excludedTotals.unclassified = roundCurrency(excludedTotals.unclassified);

  // Catálogo consolidado de categorias envolvidas (consumo recorrente ou orçamento provisório)
  const categoryMetaMap = new Map<
    number,
    { id: number; name: string; icon: string; defaultNature: DefaultConsumptionNature | null }
  >();
  for (const cat of categoryCatalog) {
    categoryMetaMap.set(cat.id, cat);
  }
  for (const tx of [...targetTxs, ...baselineMonths.flatMap((m) => baselineTxsByMonth.get(m) ?? [])]) {
    if (!categoryMetaMap.has(tx.categoryId)) {
      categoryMetaMap.set(tx.categoryId, {
        id: tx.categoryId,
        name: tx.categoryName,
        icon: tx.categoryIcon,
        defaultNature: null,
      });
    }
  }

  // Determina categorias relevantes para consumo recorrente e orçamento total de consumo
  const relevantCategoryIds = new Set<number>();
  for (const m of [...baselineMonths, targetMonth]) {
    for (const tx of classifiedByMonth.get(m) ?? []) {
      if (tx.includedInConsumption) {
        relevantCategoryIds.add(tx.categoryId);
      }
    }
  }
  for (const cat of categoryCatalog) {
    if (cat.defaultNature === "recurring" && (categoryBudgets.get(cat.id) ?? 0) > 0) {
      relevantCategoryIds.add(cat.id);
    }
  }

  let recurringBudgetTotalSum = 0;
  let hasAnyRecurringBudget = false;
  for (const catId of relevantCategoryIds) {
    const b = categoryBudgets.get(catId) ?? 0;
    if (b > 0) {
      recurringBudgetTotalSum += b;
      hasAnyRecurringBudget = true;
    }
  }
  const recurringBudgetTotal = hasAnyRecurringBudget ? roundCurrency(recurringBudgetTotalSum) : null;

  // Análise consolidada semanal
  const consolidatedWeekly = buildWeeklyAnalysis({
    targetCycle,
    baselineCycles,
    validBaselineMonths,
    targetTxs,
    baselineTxsByMonth,
    monthlyProvisionalBudget: validBaselineMonths.length === 0 ? recurringBudgetTotal : null,
  });

  const referenceSource: ReferenceSource =
    validBaselineMonths.length > 0
      ? "history"
      : recurringBudgetTotal && recurringBudgetTotal > 0
        ? "provisional_budget"
        : "none";

  // Semana atual (em andamento, ou última se fechada, ou primeira se futura)
  const currentWeek =
    consolidatedWeekly.weeks.find((w) => w.state === "in_progress") ??
    (targetCycle.weeks.every((w) => w.state === "completed")
      ? (consolidatedWeekly.weeks[consolidatedWeekly.weeks.length - 1] ?? null)
      : (consolidatedWeekly.weeks[0] ?? null));

  // Evolução histórica nas 3 competências + competência atual
  const historicalMonths: HistoricalCompetencyPoint[] = [];
  const validMonthlyRecurringTotals: number[] = [];
  const validMonthlyInstallmentTotals: number[] = [];

  for (const m of baselineMonths) {
    const mTxs = baselineTxsByMonth.get(m) ?? [];
    const recTxs = mTxs.filter((t) => t.includedInConsumption);
    const instTxs = mTxs.filter((t) => t.effectiveNature === "installment");
    const hasValidData = recTxs.length > 0;
    const totalRecurring = roundCurrency(recTxs.reduce((acc, t) => acc + t.amount, 0));
    const installmentTotal = roundCurrency(instTxs.reduce((acc, t) => acc + t.amount, 0));
    const fixedTotal = roundCurrency(
      mTxs.filter((t) => t.effectiveNature === "fixed").reduce((acc, t) => acc + t.amount, 0),
    );
    const extraordinaryTotal = roundCurrency(
      mTxs.filter((t) => t.effectiveNature === "extraordinary").reduce((acc, t) => acc + t.amount, 0),
    );

    if (hasValidData) {
      validMonthlyRecurringTotals.push(totalRecurring);
    }
    if (hasValidData || instTxs.length > 0) {
      validMonthlyInstallmentTotals.push(installmentTotal);
    }

    historicalMonths.push({
      month: m,
      label: formatMonthShortLabel(m),
      isTarget: false,
      hasValidData,
      totalRecurring,
      projectedRecurring: null,
      installmentTotal,
      fixedTotal,
      extraordinaryTotal,
      transactionCount: recTxs.length,
    });
  }

  // Cenários de fechamento da competência atual
  const isCycleClosed = targetCycle.weeks.every((w) => w.state === "completed");
  const probableProjected =
    referenceSource !== "none"
      ? roundCurrency(consolidatedWeekly.realizedTotal + consolidatedWeekly.remainingMeanTotal)
      : null;

  let scenarios: ClosingScenarios;
  if (isCycleClosed) {
    scenarios = {
      hasStatisticalBasis: true,
      referenceSource,
      optimistic: consolidatedWeekly.realizedTotal,
      probable: consolidatedWeekly.realizedTotal,
      pessimistic: consolidatedWeekly.realizedTotal,
      explanation: "Competência encerrada — valores consolidados refletem o consumo realizado.",
    };
  } else if (validBaselineMonths.length >= 2 && probableProjected !== null) {
    const effectiveRemStd = Math.max(
      consolidatedWeekly.empiricalRemainingStdDev,
      consolidatedWeekly.summedWeeklyRemainingStdDev,
    );
    const committedFloor = roundCurrency(
      consolidatedWeekly.realizedTotal + consolidatedWeekly.committedRemainingTotal,
    );
    const optimistic = roundCurrency(Math.max(committedFloor, probableProjected - effectiveRemStd));

    const paceExcess = Math.max(0, consolidatedWeekly.realizedTotal - consolidatedWeekly.expectedToDateTotal);
    const paceFactor =
      consolidatedWeekly.expectedToDateTotal > 0 && paceExcess > 0
        ? Math.min(0.5, paceExcess / consolidatedWeekly.expectedToDateTotal)
        : 0;
    const paceCarryOver = roundCurrency(consolidatedWeekly.remainingMeanTotal * paceFactor);
    const pessimistic = roundCurrency(probableProjected + effectiveRemStd + paceCarryOver);

    scenarios = {
      hasStatisticalBasis: true,
      referenceSource: "history",
      optimistic,
      probable: probableProjected,
      pessimistic,
      explanation: `Cenários baseados no desvio padrão residual (${effectiveRemStd.toFixed(0)} reais) de ${validBaselineMonths.length} competências anteriores e ritmo atual até hoje.`,
    };
  } else if (validBaselineMonths.length === 1 && probableProjected !== null) {
    scenarios = {
      hasStatisticalBasis: false,
      referenceSource: "history",
      optimistic: null,
      probable: probableProjected,
      pessimistic: null,
      explanation:
        "Apenas 1 competência válida no histórico — necessários ao menos 2 meses para calcular faixa estatística (otimista/pessimista) sem estimativa artificial.",
    };
  } else if (referenceSource === "provisional_budget" && recurringBudgetTotal !== null) {
    const provisionalProbable = roundCurrency(
      Math.max(
        consolidatedWeekly.realizedTotal + consolidatedWeekly.committedRemainingTotal,
        recurringBudgetTotal,
      ),
    );
    scenarios = {
      hasStatisticalBasis: false,
      referenceSource: "provisional_budget",
      optimistic: null,
      probable: provisionalProbable,
      pessimistic: null,
      explanation:
        "Sem histórico suficiente — previsão provisória baseada no orçamento das categorias de consumo (não baseada em histórico).",
    };
  } else {
    scenarios = {
      hasStatisticalBasis: false,
      referenceSource: "none",
      optimistic: null,
      probable: null,
      pessimistic: null,
      explanation: "Sem histórico suficiente ou orçamento cadastrado para projetar o fechamento.",
    };
  }

  const targetRecTxs = targetTxs.filter((t) => t.includedInConsumption);
  const targetInstTxs = targetTxs.filter((t) => t.effectiveNature === "installment");
  historicalMonths.push({
    month: targetMonth,
    label: formatMonthShortLabel(targetMonth),
    isTarget: true,
    hasValidData: targetRecTxs.length > 0,
    totalRecurring: consolidatedWeekly.realizedTotal,
    projectedRecurring: scenarios.probable,
    installmentTotal: excludedTotals.installment,
    fixedTotal: excludedTotals.fixed,
    extraordinaryTotal: excludedTotals.extraordinary,
    transactionCount: targetRecTxs.length,
  });

  const installmentHistoricalMean =
    validMonthlyInstallmentTotals.length > 0
      ? roundCurrency(
          validMonthlyInstallmentTotals.reduce((acc, v) => acc + v, 0) / validMonthlyInstallmentTotals.length,
        )
      : 0;
  const installmentDiffAmount =
    validMonthlyInstallmentTotals.length > 0
      ? roundCurrency(excludedTotals.installment - installmentHistoricalMean)
      : null;
  const installmentDiffPercent =
    validMonthlyInstallmentTotals.length > 0 && installmentHistoricalMean > 0
      ? roundCurrency(((excludedTotals.installment - installmentHistoricalMean) / installmentHistoricalMean) * 100)
      : null;

  const installmentsSummary: InstallmentsSummary = {
    currentTotal: excludedTotals.installment,
    currentCount: excludedTotals.installmentCount,
    historicalMean: installmentHistoricalMean,
    validBaselineCount: validMonthlyInstallmentTotals.length,
    differenceAmount: installmentDiffAmount,
    differencePercent: installmentDiffPercent,
    byWeek: targetCycle.weeks.map((w) => {
      const weekInst = targetInstTxs.filter((t) => t.weekNumber === w.weekNumber);
      return {
        weekNumber: w.weekNumber,
        label: w.label,
        amount: roundCurrency(weekInst.reduce((acc, t) => acc + t.amount, 0)),
        count: weekInst.length,
      };
    }),
  };

  // Tendência histórica (entre os meses de referência válidos, comparando o último mês fechado com os anteriores)
  let trend: HistoricalTrend = "insufficient_data";
  let trendPercent: number | null = null;
  if (validMonthlyRecurringTotals.length >= 2) {
    const latest = validMonthlyRecurringTotals[validMonthlyRecurringTotals.length - 1];
    const earlier = validMonthlyRecurringTotals.slice(0, -1);
    const earlierMean = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    if (earlierMean > 0) {
      trendPercent = roundCurrency(((latest - earlierMean) / earlierMean) * 100);
      if (trendPercent >= 8) trend = "increasing";
      else if (trendPercent <= -8) trend = "decreasing";
      else trend = "stable";
    }
  }

  // Indicadores gerais consolidados
  const overallMonthlyMean =
    validMonthlyRecurringTotals.length > 0
      ? roundCurrency(
          validMonthlyRecurringTotals.reduce((a, b) => a + b, 0) / validMonthlyRecurringTotals.length,
        )
      : (recurringBudgetTotal ?? 0);
  const overallMonthlyStdDev = roundCurrency(sampleStdDev(validMonthlyRecurringTotals));

  const overallExpectedToDate = isCycleClosed
    ? consolidatedWeekly.expectedCompetencyTotal
    : consolidatedWeekly.expectedToDateTotal;

  const overallCompareStd =
    validBaselineMonths.length >= 2
      ? Math.sqrt(
          consolidatedWeekly.weeks
            .filter((w) => w.state !== "future")
            .reduce((acc, w) => acc + w.expectedToDateStdDev ** 2, 0),
        )
      : overallMonthlyStdDev;

  const overallStatus = classifyPerformanceStatus(
    consolidatedWeekly.realizedTotal,
    overallExpectedToDate,
    overallCompareStd,
    validBaselineMonths.length,
    targetCycle.weeks.every((w) => w.state === "future")
      ? "future"
      : isCycleClosed
        ? "completed"
        : "in_progress",
  );

  const overallConfidence = computeConfidence({
    validObservations: validBaselineMonths.length,
    historicalValues: validMonthlyRecurringTotals,
    mean: overallMonthlyMean,
    stdDev: overallMonthlyStdDev,
    isProvisionalBudget: referenceSource === "provisional_budget",
  });

  const differenceVsHistoryAmount =
    scenarios.probable !== null && consolidatedWeekly.expectedCompetencyTotal > 0
      ? roundCurrency(scenarios.probable - consolidatedWeekly.expectedCompetencyTotal)
      : referenceSource !== "none" && overallExpectedToDate > 0
        ? roundCurrency(consolidatedWeekly.realizedTotal - overallExpectedToDate)
        : null;

  const differenceVsHistoryPercent =
    scenarios.probable !== null && consolidatedWeekly.expectedCompetencyTotal > 0
      ? roundCurrency(
          ((scenarios.probable - consolidatedWeekly.expectedCompetencyTotal) /
            consolidatedWeekly.expectedCompetencyTotal) *
            100,
        )
      : referenceSource !== "none" && overallExpectedToDate > 0
        ? roundCurrency(
            ((consolidatedWeekly.realizedTotal - overallExpectedToDate) / overallExpectedToDate) * 100,
          )
        : null;

  const budgetConsumptionPercent =
    recurringBudgetTotal && recurringBudgetTotal > 0
      ? roundCurrency((consolidatedWeekly.realizedTotal / recurringBudgetTotal) * 100)
      : null;

  // Detalhamento por categoria
  const categoriesSummary: CategoryConsumptionSummary[] = [];
  for (const catId of relevantCategoryIds) {
    const meta = categoryMetaMap.get(catId);
    const catName = meta?.name ?? "Sem categoria";
    const catIcon = meta?.icon ?? "Tag";
    const catBudget = categoryBudgets.get(catId) ?? null;

    const catTargetTxs = targetTxs.filter((t) => t.categoryId === catId && t.includedInConsumption);
    const catBaselineByMonth = new Map<string, ClassifiedTransaction[]>();
    const catValidBaselineMonths: string[] = [];
    const catMonthlyTotals: number[] = [];

    for (const m of baselineMonths) {
      const mCatTxs = (baselineTxsByMonth.get(m) ?? []).filter(
        (t) => t.categoryId === catId && t.includedInConsumption,
      );
      catBaselineByMonth.set(m, mCatTxs);
      if (validBaselineMonths.includes(m) && mCatTxs.length > 0) {
        catValidBaselineMonths.push(m);
        catMonthlyTotals.push(roundCurrency(mCatTxs.reduce((acc, t) => acc + t.amount, 0)));
      }
    }

    const catWeekly = buildWeeklyAnalysis({
      targetCycle,
      baselineCycles,
      validBaselineMonths: catValidBaselineMonths,
      targetTxs: catTargetTxs,
      baselineTxsByMonth: catBaselineByMonth,
      monthlyProvisionalBudget: catValidBaselineMonths.length === 0 ? catBudget : null,
    });

    const catRefSource: ReferenceSource =
      catValidBaselineMonths.length > 0
        ? "history"
        : catBudget && catBudget > 0
          ? "provisional_budget"
          : "none";

    const catMonthlyMean =
      catMonthlyTotals.length > 0
        ? roundCurrency(catMonthlyTotals.reduce((acc, v) => acc + v, 0) / catMonthlyTotals.length)
        : (catBudget ?? 0);
    const catMonthlyStdDev = roundCurrency(sampleStdDev(catMonthlyTotals));

    const weekCountForAvg = Math.max(1, targetCycle.weeks.length);
    const weeklyHistoricalMean = roundCurrency(catWeekly.expectedCompetencyTotal / weekCountForAvg);

    const catProjectedClosing =
      catRefSource !== "none"
        ? roundCurrency(catWeekly.realizedTotal + catWeekly.remainingMeanTotal)
        : null;

    const catExpectedToDate = isCycleClosed
      ? catWeekly.expectedCompetencyTotal
      : catWeekly.expectedToDateTotal;

    const catCompareStd =
      catValidBaselineMonths.length >= 2
        ? Math.sqrt(
            catWeekly.weeks
              .filter((w) => w.state !== "future")
              .reduce((acc, w) => acc + w.expectedToDateStdDev ** 2, 0),
          )
        : catMonthlyStdDev;

    const catStatus = classifyPerformanceStatus(
      catWeekly.realizedTotal,
      catExpectedToDate,
      catCompareStd,
      catValidBaselineMonths.length,
      targetCycle.weeks.every((w) => w.state === "future")
        ? "future"
        : isCycleClosed
          ? "completed"
          : "in_progress",
    );

    const catConfidence = computeConfidence({
      validObservations: catValidBaselineMonths.length,
      historicalValues: catMonthlyTotals,
      mean: catMonthlyMean,
      stdDev: catMonthlyStdDev,
      isProvisionalBudget: catRefSource === "provisional_budget",
    });

    const catVariationAmount =
      catRefSource !== "none" ? roundCurrency(catWeekly.realizedTotal - catExpectedToDate) : 0;
    const catVariationPercent =
      catRefSource !== "none" && catExpectedToDate > 0
        ? roundCurrency(((catWeekly.realizedTotal - catExpectedToDate) / catExpectedToDate) * 100)
        : null;

    const catBudgetUsage =
      catBudget && catBudget > 0 ? roundCurrency((catWeekly.realizedTotal / catBudget) * 100) : null;

    categoriesSummary.push({
      categoryId: catId,
      categoryName: catName,
      categoryIcon: catIcon,
      defaultNature: meta?.defaultNature ?? null,
      weeklyHistoricalMean,
      expectedCompetencyTotal: catWeekly.expectedCompetencyTotal,
      expectedToDateTotal: catExpectedToDate,
      realizedTotal: catWeekly.realizedTotal,
      projectedClosing: catProjectedClosing,
      variationAmount: catVariationAmount,
      variationPercent: catVariationPercent,
      monthlyBudget: catBudget,
      budgetUsagePercent: catBudgetUsage,
      status: catStatus,
      confidence: catConfidence.level,
      confidenceReasons: catConfidence.reasons,
      validObservations: catValidBaselineMonths.length,
      referenceSource: catRefSource,
      weeks: catWeekly.weeks,
    });
  }

  categoriesSummary.sort((a, b) => {
    const scoreA = Math.max(a.realizedTotal, a.expectedCompetencyTotal, a.projectedClosing ?? 0);
    const scoreB = Math.max(b.realizedTotal, b.expectedCompetencyTotal, b.projectedClosing ?? 0);
    return scoreB - scoreA;
  });

  // Ordena transações auditáveis: não classificados primeiro, depois data mais recente
  const auditTransactions = [...targetTxs].sort((a, b) => {
    if (a.effectiveNature === "unclassified" && b.effectiveNature !== "unclassified") return -1;
    if (a.effectiveNature !== "unclassified" && b.effectiveNature === "unclassified") return 1;
    if (b.launchDate !== a.launchDate) return b.launchDate.localeCompare(a.launchDate);
    return b.id - a.id;
  });

  return {
    competencyMonth: targetMonth,
    competencyLabel: targetCycle.label,
    closingDay,
    cycleStartDate: targetCycle.startDate,
    cycleEndDate: targetCycle.endDate,
    referenceToday: referenceToday.slice(0, 10),
    summary: {
      expectedCompetencyTotal: consolidatedWeekly.expectedCompetencyTotal,
      expectedToDateTotal: overallExpectedToDate,
      realizedTotal: consolidatedWeekly.realizedTotal,
      projectedClosing: scenarios.probable,
      differenceVsHistoryAmount,
      differenceVsHistoryPercent,
      recurringBudgetTotal,
      budgetConsumptionPercent,
      overallStatus,
      overallConfidence: overallConfidence.level,
      confidenceReasons: overallConfidence.reasons,
      validBaselineCount: validBaselineMonths.length,
      referenceSource,
      excludedTotals,
    },
    currentWeek,
    weeks: consolidatedWeekly.weeks,
    installmentsSummary,
    scenarios,
    categories: categoriesSummary,
    historicalEvolution: {
      months: historicalMonths,
      trend,
      trendPercent,
      validBaselineMonths,
    },
    auditTransactions,
  };
}
