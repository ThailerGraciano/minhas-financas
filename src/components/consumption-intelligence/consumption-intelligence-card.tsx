"use client";

import { getConsumptionIntelligenceData } from "@/app/actions/consumption-intelligence";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ConsumptionIntelligenceResult, ConsumptionNature } from "@/lib/consumption-intelligence";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileSearch,
  Layers,
  Settings2,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AuditClassificationPanel } from "./audit-classification-panel";
import { CategoryBreakdownTable } from "./category-breakdown-table";
import { CONFIDENCE_META, STATUS_META, formatCurrencyBRL } from "./constants";
import { HistoricalEvolutionView } from "./historical-evolution-view";
import { WeeklyConsumptionChart } from "./weekly-consumption-chart";

interface ConsumptionIntelligenceCardProps {
  initialData: ConsumptionIntelligenceResult;
  selectedMonth: string;
  showBalance?: boolean;
}

type ActiveSectionTab = "weekly" | "categories" | "evolution" | "audit";

export function ConsumptionIntelligenceCard({
  initialData,
  selectedMonth,
  showBalance = true,
}: ConsumptionIntelligenceCardProps) {
  const router = useRouter();
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  const [data, setData] = useState<ConsumptionIntelligenceResult>(initialData);
  const [activeTab, setActiveTab] = useState<ActiveSectionTab>("weekly");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [auditWeekFilter, setAuditWeekFilter] = useState<number | null>(null);
  const [auditNatureFilter, setAuditNatureFilter] = useState<ConsumptionNature | "all">("all");
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<number | null>(null);

  // Sincronização derivada sem setState síncrono dentro de useEffect (compatível com React 19 ESLint)
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setData(initialData);
    setSelectedCategoryId(null);
    setAuditWeekFilter(null);
    setAuditNatureFilter("all");
    setAuditCategoryFilter(null);
  }

  const refreshIntelligence = useCallback(async () => {
    const fresh = await getConsumptionIntelligenceData(selectedMonth);
    setData(fresh);
    router.refresh();
  }, [selectedMonth, router]);

  const selectedCategory = useMemo(
    () => (selectedCategoryId !== null ? (data.categories.find((c) => c.categoryId === selectedCategoryId) ?? null) : null),
    [data.categories, selectedCategoryId],
  );

  const displayedWeeks = selectedCategory ? selectedCategory.weeks : data.weeks;

  const currentWeek = useMemo(() => {
    if (selectedCategory) {
      return (
        selectedCategory.weeks.find((w) => w.state === "in_progress") ??
        selectedCategory.weeks[selectedCategory.weeks.length - 1] ??
        null
      );
    }
    return data.currentWeek;
  }, [selectedCategory, data.currentWeek]);

  const handleSelectWeekForAudit = (weekNumber: 1 | 2 | 3 | 4 | 5) => {
    setAuditWeekFilter(weekNumber);
    setAuditNatureFilter("all");
    setAuditCategoryFilter(selectedCategoryId);
    setActiveTab("audit");
  };

  const handleSelectCategoryForAudit = (categoryId: number) => {
    setAuditCategoryFilter(categoryId);
    setAuditWeekFilter(null);
    setAuditNatureFilter("all");
    setActiveTab("audit");
  };

  const overallStatusMeta = STATUS_META[data.summary.overallStatus];
  const overallConfMeta = CONFIDENCE_META[data.summary.overallConfidence];
  const { excludedTotals } = data.summary;

  return (
    <div className="bg-card/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] w-full min-w-0 flex flex-col gap-5 relative overflow-hidden">
      {/* Specular top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="h-9 w-9 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
            <Activity className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">Inteligência de Consumo</h2>
              <Badge variant="outline" className={cn("text-[10px]", overallStatusMeta.badgeClass)}>
                {overallStatusMeta.label}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] border-white/10 bg-white/[0.04] text-muted-foreground"
                title="Cálculo independente do fluxo de caixa: considera sempre a data real da compra (launch_date)."
              >
                Base: data da compra
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consumo recorrente semanal ({data.cycleStartDate.split("-").reverse().join("/")} a{" "}
              {data.cycleEndDate.split("-").reverse().join("/")}) • Referência:{" "}
              {data.summary.validBaselineCount}/3 competências anteriores
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/categories"
            className="h-9 px-3 rounded-full bg-white/[0.04] border border-white/[0.10] text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.08] inline-flex items-center gap-1.5 transition-colors"
            title="Configurar a natureza padrão das categorias e subcategorias"
          >
            <Settings2 className="h-3.5 w-3.5 text-primary" />
            <span>Configurar categorias</span>
          </Link>

          {excludedTotals.unclassifiedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setAuditNatureFilter("unclassified");
                setAuditWeekFilter(null);
                setAuditCategoryFilter(null);
                setActiveTab("audit");
              }}
              className="h-9 px-3 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-rose-500/25 transition-colors cursor-pointer"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>
                {excludedTotals.unclassifiedCount} não classificado
                {excludedTotals.unclassifiedCount > 1 ? "s" : ""}
              </span>
            </button>
          )}

          {data.categories.length > 0 && (
            <Select
              value={selectedCategoryId === null ? "all" : String(selectedCategoryId)}
              onValueChange={(val) => setSelectedCategoryId(val === "all" ? null : Number(val))}
            >
              <SelectTrigger
                aria-label="Filtrar gráfico semanal por categoria"
                className="h-9 w-[200px] rounded-full text-xs bg-white/[0.04] border-white/[0.10]"
              >
                <SelectValue placeholder="Todas categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias (Consolidado)</SelectItem>
                {data.categories.map((cat) => (
                  <SelectItem key={cat.categoryId} value={String(cat.categoryId)}>
                    {cat.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Banner orientativo quando nenhuma categoria/subcategoria foi tipada ainda */}
      {data.summary.realizedTotal === 0 && excludedTotals.unclassifiedCount > 0 && (
        <div className="rounded-2xl bg-primary/10 border border-primary/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground">
              Defina quais categorias ou subcategorias representam consumo recorrente
            </p>
            <p className="text-muted-foreground">
              Subcategorias herdam a natureza da categoria pai e começam como &quot;Não definido&quot;. Assim você separa
              a compra do mês de compras pontuais de consumo.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/categories"
              className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all"
            >
              Configurar em Categorias
            </Link>
            <button
              type="button"
              onClick={() => {
                setAuditNatureFilter("unclassified");
                setAuditWeekFilter(null);
                setAuditCategoryFilter(null);
                setActiveTab("audit");
              }}
              className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-foreground font-medium hover:bg-white/[0.10] cursor-pointer"
            >
              Ver pendentes
            </button>
          </div>
        </div>
      )}

      {/* KPIs Gerais (Seção 9) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">
            Consumo realizado
          </span>
          <p className="text-base sm:text-lg font-bold tabular-nums text-foreground mt-1">
            {formatCurrencyBRL(data.summary.realizedTotal, showBalance)}
          </p>
          <span className="text-[10px] text-muted-foreground">Apenas consumo recorrente</span>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">
            Esperado na comp.
          </span>
          <p className="text-base sm:text-lg font-bold tabular-nums text-foreground mt-1">
            {data.summary.referenceSource === "none"
              ? "Sem base"
              : formatCurrencyBRL(data.summary.expectedCompetencyTotal, showBalance)}
          </p>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {data.summary.referenceSource === "provisional_budget"
              ? "Provisório (orçamento)"
              : data.summary.referenceSource === "history"
                ? `Até hoje: ${formatCurrencyBRL(data.summary.expectedToDateTotal, showBalance)}`
                : "Aguardando histórico"}
          </span>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">
            Previsão fechamento
          </span>
          <p className="text-base sm:text-lg font-bold tabular-nums text-primary mt-1">
            {data.summary.projectedClosing !== null
              ? formatCurrencyBRL(data.summary.projectedClosing, showBalance)
              : "Sem previsão"}
          </p>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {data.scenarios.hasStatisticalBasis &&
            data.scenarios.optimistic !== null &&
            data.scenarios.pessimistic !== null
              ? `${formatCurrencyBRL(data.scenarios.optimistic, showBalance)} – ${formatCurrencyBRL(data.scenarios.pessimistic, showBalance)}`
              : "Cenário provável"}
          </span>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">
            Prev. vs. histórico
          </span>
          <p
            className={cn(
              "text-base sm:text-lg font-bold tabular-nums mt-1",
              data.summary.differenceVsHistoryAmount === null
                ? "text-muted-foreground"
                : data.summary.differenceVsHistoryAmount > 0
                  ? "text-rose-400"
                  : "text-emerald-400",
            )}
          >
            {data.summary.differenceVsHistoryAmount === null
              ? "—"
              : `${data.summary.differenceVsHistoryAmount > 0 ? "+" : ""}${formatCurrencyBRL(data.summary.differenceVsHistoryAmount, showBalance)}`}
          </p>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {data.summary.differenceVsHistoryPercent !== null
              ? `${data.summary.differenceVsHistoryPercent > 0 ? "+" : ""}${data.summary.differenceVsHistoryPercent.toFixed(1)}% vs. esperado`
              : "Sem comparativo"}
          </span>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">
            % do orçamento
          </span>
          <p className="text-base sm:text-lg font-bold tabular-nums text-foreground mt-1">
            {data.summary.budgetConsumptionPercent !== null
              ? `${data.summary.budgetConsumptionPercent.toFixed(0)}%`
              : "—"}
          </p>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {data.summary.recurringBudgetTotal !== null
              ? `Teto: ${formatCurrencyBRL(data.summary.recurringBudgetTotal, showBalance)}`
              : "Sem orçamento definido"}
          </span>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">
            Confiança geral
          </span>
          <div className="mt-1 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <Badge variant="outline" className={cn("text-xs", overallConfMeta.badgeClass)}>
              {overallConfMeta.label}
            </Badge>
          </div>
          <span
            className="text-[10px] text-muted-foreground block mt-1 truncate"
            title={data.summary.confidenceReasons.join(" ")}
          >
            {data.summary.confidenceReasons[0] ?? `${data.summary.validBaselineCount}/3 competências`}
          </span>
        </div>
      </div>

      {/* Abas da Seção */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveSectionTab)} className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto rounded-2xl p-1 bg-white/[0.04]">
          <TabsTrigger value="weekly" className="rounded-xl text-xs py-1.5 gap-1.5 cursor-pointer">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Visão Semanal</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl text-xs py-1.5 gap-1.5 cursor-pointer">
            <Layers className="h-3.5 w-3.5" />
            <span>Por Categoria ({data.categories.length})</span>
          </TabsTrigger>
          <TabsTrigger value="evolution" className="rounded-xl text-xs py-1.5 gap-1.5 cursor-pointer">
            <CalendarClock className="h-3.5 w-3.5" />
            <span>Evolução (3m)</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl text-xs py-1.5 gap-1.5 cursor-pointer">
            <FileSearch className="h-3.5 w-3.5" />
            <span>
              Auditoria ({data.auditTransactions.length})
              {excludedTotals.unclassifiedCount > 0 ? ` • ${excludedTotals.unclassifiedCount}` : ""}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4 mt-0">
          {selectedCategory && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-primary/10 border border-primary/30 px-3 py-2 text-xs">
              <span>
                Exibindo semanas da categoria <strong className="text-foreground">{selectedCategory.categoryName}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className="text-primary font-semibold hover:underline cursor-pointer"
              >
                Voltar ao consolidado
              </button>
            </div>
          )}

          <WeeklyConsumptionChart
            weeks={displayedWeeks}
            showBalance={showBalance}
            onSelectWeek={handleSelectWeekForAudit}
          />

          {/* Semana Atual (comparação parcial equivalente) + 3 Cenários da Competência */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {currentWeek && (
              <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-foreground">
                      {currentWeek.state === "in_progress"
                        ? `Semana em andamento (${currentWeek.label})`
                        : `Resumo da ${currentWeek.label}`}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {currentWeek.dateRangeLabel}
                      {currentWeek.isPartial
                        ? ` • Comparando dias 1 a ${currentWeek.elapsedDays} de ${currentWeek.dayCount}`
                        : ""}
                    </span>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", STATUS_META[currentWeek.status].badgeClass)}>
                    {STATUS_META[currentWeek.status].label}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Realizado</span>
                    <span className="font-bold tabular-nums text-foreground">
                      {formatCurrencyBRL(currentWeek.actualToDate, showBalance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">
                      {currentWeek.isPartial ? `Esp. até dia ${currentWeek.elapsedDays}` : "Esperado"}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground/90">
                      {currentWeek.referenceSource === "none"
                        ? "—"
                        : formatCurrencyBRL(currentWeek.expectedToDateMean, showBalance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Previsão semana</span>
                    <span className="font-bold tabular-nums text-primary">
                      {formatCurrencyBRL(currentWeek.projectedTotal, showBalance)}
                    </span>
                  </div>
                </div>

                {currentWeek.confidenceReasons.length > 0 && (
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-white/[0.06]">
                    {currentWeek.confidenceReasons.join(" ")}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">Cenários de fechamento da competência</span>
                <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground">
                  {data.scenarios.hasStatisticalBasis
                    ? "Base estatística"
                    : data.scenarios.referenceSource === "provisional_budget"
                      ? "Orçamento provisório"
                      : "Dados limitados"}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 p-2.5">
                  <span className="text-[10px] text-emerald-300 font-medium block">Otimista</span>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {data.scenarios.optimistic !== null
                      ? formatCurrencyBRL(data.scenarios.optimistic, showBalance)
                      : "—"}
                  </span>
                </div>
                <div className="rounded-xl bg-primary/10 border border-primary/30 p-2.5">
                  <span className="text-[10px] text-primary font-medium block">Provável</span>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {data.scenarios.probable !== null
                      ? formatCurrencyBRL(data.scenarios.probable, showBalance)
                      : "—"}
                  </span>
                </div>
                <div className="rounded-xl bg-rose-500/[0.07] border border-rose-500/20 p-2.5">
                  <span className="text-[10px] text-rose-300 font-medium block">Pessimista</span>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {data.scenarios.pessimistic !== null
                      ? formatCurrencyBRL(data.scenarios.pessimistic, showBalance)
                      : "—"}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">{data.scenarios.explanation}</p>
            </div>
          </div>

          {/* Acompanhamento separado de Compras Parceladas */}
          <div className="rounded-2xl bg-indigo-500/[0.06] border border-indigo-500/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Layers className="h-4 w-4 text-indigo-300" />
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Compras Parceladas (separado do consumo variável)
                  </span>
                  <Badge variant="outline" className="text-[10px] border-indigo-500/35 bg-indigo-500/12 text-indigo-300">
                    {data.installmentsSummary.currentCount} parcela
                    {data.installmentsSummary.currentCount === 1 ? "" : "s"} na comp.
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {data.installmentsSummary.validBaselineCount > 0
                    ? `Média dos últimos ${data.installmentsSummary.validBaselineCount} mes(es): ${formatCurrencyBRL(data.installmentsSummary.historicalMean, showBalance)}`
                    : "Sem histórico anterior para comparação de parceladas."}
                  {data.installmentsSummary.differenceAmount !== null && (
                    <span
                      className={cn(
                        "ml-1.5 font-semibold",
                        data.installmentsSummary.differenceAmount > 0 ? "text-rose-400" : "text-emerald-400",
                      )}
                    >
                      ({data.installmentsSummary.differenceAmount > 0 ? "+" : ""}
                      {formatCurrencyBRL(data.installmentsSummary.differenceAmount, showBalance)}
                      {data.installmentsSummary.differencePercent !== null
                        ? `, ${data.installmentsSummary.differencePercent > 0 ? "+" : ""}${data.installmentsSummary.differencePercent.toFixed(1)}%`
                        : ""}
                      )
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-muted-foreground block">Total parcelado no ciclo</span>
                <span className="text-base font-bold tabular-nums text-indigo-200">
                  {formatCurrencyBRL(data.installmentsSummary.currentTotal, showBalance)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuditNatureFilter("installment");
                  setAuditWeekFilter(null);
                  setAuditCategoryFilter(null);
                  setActiveTab("audit");
                }}
                className="px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/35 text-indigo-200 text-xs font-medium hover:bg-indigo-500/25 transition-colors cursor-pointer"
              >
                Ver parcelas
              </button>
            </div>
          </div>

          {/* Indicadores separados (transparência do que NÃO contamina o consumo) */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/[0.02] border border-white/[0.06] px-3.5 py-2.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 text-foreground/85 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Isolamento ativo (excluídos da média de consumo):</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
              <span>
                Parceladas:{" "}
                <strong className="text-indigo-300">{formatCurrencyBRL(excludedTotals.installment, showBalance)}</strong>
              </span>
              <span>
                Fixas: <strong className="text-foreground">{formatCurrencyBRL(excludedTotals.fixed, showBalance)}</strong>
              </span>
              <span>
                Extraordinárias:{" "}
                <strong className="text-foreground">{formatCurrencyBRL(excludedTotals.extraordinary, showBalance)}</strong>
              </span>
              <span>
                Movimentações/Fatura:{" "}
                <strong className="text-foreground">
                  {formatCurrencyBRL(excludedTotals.financialMovement, showBalance)}
                </strong>
              </span>
              {excludedTotals.individualWithdrawal > 0 && (
                <span>
                  Retiradas:{" "}
                  <strong className="text-foreground">
                    {formatCurrencyBRL(excludedTotals.individualWithdrawal, showBalance)}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-0">
          <CategoryBreakdownTable
            categories={data.categories}
            showBalance={showBalance}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(catId) => {
              setSelectedCategoryId(catId);
              if (catId !== null) setActiveTab("weekly");
            }}
            onAuditCategory={handleSelectCategoryForAudit}
          />
        </TabsContent>

        <TabsContent value="evolution" className="mt-0">
          <HistoricalEvolutionView
            months={data.historicalEvolution.months}
            trend={data.historicalEvolution.trend}
            trendPercent={data.historicalEvolution.trendPercent}
            showBalance={showBalance}
          />
        </TabsContent>

        <TabsContent value="audit" className="mt-0">
          <AuditClassificationPanel
            transactions={data.auditTransactions}
            showBalance={showBalance}
            filterWeek={auditWeekFilter}
            onFilterWeekChange={setAuditWeekFilter}
            filterNature={auditNatureFilter}
            onFilterNatureChange={setAuditNatureFilter}
            filterCategoryId={auditCategoryFilter}
            onFilterCategoryIdChange={setAuditCategoryFilter}
            onClassificationUpdated={refreshIntelligence}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
