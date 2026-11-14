"use client";

import type {
  OpenInvoiceCardSummary,
  OpenInvoiceCategoryItem,
  OpenInvoicesAnalysisData,
} from "@/app/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, CalendarClock, CreditCard, Flame, Layers, Repeat, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface OpenInvoiceXrayChartProps {
  data: OpenInvoicesAnalysisData;
  showBalance?: boolean;
}

interface ChartCategoryRow {
  name: string;
  fatura: number;
  orcamento: number;
  hasBudget: boolean;
  percentOfInvoice: number;
  percentOfBudget: number;
  installmentAmount: number;
  fixedAmount: number;
  variableAmount: number;
  transactionCount: number;
  isOverBudget: boolean;
  isNearBudget: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: ChartCategoryRow;
  }>;
  formatCurrency: (value: number) => string;
}

function OpenInvoiceTooltip({ active, payload, formatCurrency }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-xl border border-white/10 rounded-xl px-3.5 py-2.5 shadow-2xl text-xs min-w-[210px]">
      <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-white/10">
        <span className="font-semibold text-foreground">{row.name}</span>
        <span className="text-[11px] text-muted-foreground">{row.percentOfInvoice.toFixed(1)}% da fatura</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Na fatura aberta:</span>
          <span className="font-bold text-foreground">{formatCurrency(row.fatura)}</span>
        </div>
        {row.hasBudget ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Orçamento da categoria:</span>
            <span className="font-medium text-muted-foreground">{formatCurrency(row.orcamento)}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Orçamento:</span>
            <span className="text-muted-foreground/70 italic">Não definido</span>
          </div>
        )}
        {row.hasBudget && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Consumo do teto:</span>
            <span
              className={cn(
                "font-semibold",
                row.isOverBudget ? "text-rose-400" : row.isNearBudget ? "text-amber-400" : "text-emerald-400",
              )}
            >
              {row.percentOfBudget.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 pt-1.5 border-t border-white/10 grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <span className="block text-muted-foreground">Novos</span>
          <span className="font-medium text-foreground">{formatCurrency(row.variableAmount)}</span>
        </div>
        <div>
          <span className="block text-muted-foreground">Parcelas</span>
          <span className="font-medium text-foreground">{formatCurrency(row.installmentAmount)}</span>
        </div>
        <div>
          <span className="block text-muted-foreground">Fixas</span>
          <span className="font-medium text-foreground">{formatCurrency(row.fixedAmount)}</span>
        </div>
      </div>
    </div>
  );
}

export function OpenInvoiceXrayChart({ data, showBalance = true }: OpenInvoiceXrayChartProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>("all");

  const formatCurrency = (value: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCompact = (value: number) => {
    if (!showBalance) return "••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  const selectedCard: OpenInvoiceCardSummary | null = useMemo(() => {
    if (selectedCardId === "all") return null;
    return data.cards.find((c) => String(c.cardId) === selectedCardId) ?? null;
  }, [data.cards, selectedCardId]);

  const activeSummary = useMemo(() => {
    if (selectedCard) {
      return {
        totalAmount: selectedCard.totalAmount,
        installmentAmount: selectedCard.installmentAmount,
        fixedAmount: selectedCard.fixedAmount,
        variableAmount: selectedCard.variableAmount,
        limit: selectedCard.creditLimit,
        daysUntilClosing: selectedCard.daysUntilClosing,
        dailyPace: selectedCard.dailyPace,
        categories: selectedCard.categories,
      };
    }
    return {
      totalAmount: data.consolidated.totalAmount,
      installmentAmount: data.consolidated.installmentAmount,
      fixedAmount: data.consolidated.fixedAmount,
      variableAmount: data.consolidated.variableAmount,
      limit: data.consolidated.totalLimit,
      daysUntilClosing: data.consolidated.nearestClosingDays,
      dailyPace: data.consolidated.dailyPace,
      categories: data.consolidated.categories,
    };
  }, [selectedCard, data.consolidated]);

  const composition = useMemo(() => {
    const total = activeSummary.totalAmount;
    if (total <= 0) {
      return { variablePct: 0, installmentPct: 0, fixedPct: 0 };
    }
    return {
      variablePct: (activeSummary.variableAmount / total) * 100,
      installmentPct: (activeSummary.installmentAmount / total) * 100,
      fixedPct: (activeSummary.fixedAmount / total) * 100,
    };
  }, [activeSummary]);

  const chartRows: ChartCategoryRow[] = useMemo(() => {
    return activeSummary.categories.slice(0, 8).map((cat: OpenInvoiceCategoryItem) => {
      const hasBudget = cat.budgetLimit > 0;
      return {
        name: cat.categoryName,
        fatura: cat.totalAmount,
        orcamento: cat.budgetLimit,
        hasBudget,
        percentOfInvoice: cat.percentOfInvoice,
        percentOfBudget: cat.percentOfBudget,
        installmentAmount: cat.installmentAmount,
        fixedAmount: cat.fixedAmount,
        variableAmount: cat.variableAmount,
        transactionCount: cat.transactionCount,
        isOverBudget: hasBudget && cat.totalAmount > cat.budgetLimit,
        isNearBudget: hasBudget && cat.totalAmount <= cat.budgetLimit && cat.percentOfBudget >= 80,
      };
    });
  }, [activeSummary.categories]);

  const limitUsagePct =
    activeSummary.limit > 0 ? Math.min(100, (activeSummary.totalAmount / activeSummary.limit) * 100) : 0;

  if (!data.cards || data.cards.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border border-dashed border-white/10 rounded-2xl">
        Nenhum cartão de crédito cadastrado.
      </div>
    );
  }

  const chartHeight = Math.max(220, chartRows.length * 46);

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho estilo Opção 1: Seletor de cartão + KPIs da Fatura em Aberto */}
      <div className="flex flex-col gap-3">
        {data.cards.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCardId("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                selectedCardId === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-white/[0.04] text-muted-foreground border-white/[0.08] hover:bg-white/[0.08] hover:text-foreground",
              )}
            >
              Todos os cartões
            </button>
            {data.cards.map((card) => (
              <button
                key={card.cardId}
                type="button"
                onClick={() => setSelectedCardId(String(card.cardId))}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5",
                  selectedCardId === String(card.cardId)
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-white/[0.04] text-muted-foreground border-white/[0.08] hover:bg-white/[0.08] hover:text-foreground",
                )}
              >
                <CreditCard className="h-3 w-3" />
                {card.cardName}
              </button>
            ))}
          </div>
        )}

        {/* Métricas principais do ciclo aberto */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Fatura em aberto
              </span>
              {selectedCard ? (
                <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10">
                  {selectedCard.invoiceLabel}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10">
                  Ciclo atual
                </Badge>
              )}
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
              {formatCurrency(activeSummary.totalAmount)}
            </p>
            {activeSummary.limit > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Uso do limite</span>
                  <span className="font-medium text-foreground">{limitUsagePct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      limitUsagePct >= 90 ? "bg-rose-500" : limitUsagePct >= 70 ? "bg-amber-500" : "bg-primary",
                    )}
                    style={{ width: `${limitUsagePct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
              <span>{selectedCard ? "Fechamento do cartão" : "Próximo fechamento"}</span>
            </div>
            <div className="mt-1">
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {activeSummary.daysUntilClosing === 0
                  ? "Fecha hoje"
                  : activeSummary.daysUntilClosing === 1
                    ? "Falta 1 dia"
                    : `Faltam ${activeSummary.daysUntilClosing ?? 0} dias`}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {selectedCard
                  ? `Fecha ${selectedCard.closingDateLabel} • Vence ${selectedCard.dueDateLabel}`
                  : "Considerando o cartão que fecha primeiro"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>Ritmo médio diário</span>
            </div>
            <div className="mt-1">
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {formatCurrency(activeSummary.dailyPace)}
                <span className="text-xs font-normal text-muted-foreground">/dia</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Novos gastos:{" "}
                <span className="text-foreground font-medium">{formatCurrency(activeSummary.variableAmount)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Composição: Novos vs Parcelas vs Fixas */}
      {activeSummary.totalAmount > 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-foreground">Composição da fatura em aberto</span>
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                <ShoppingBag className="h-3 w-3 text-violet-400" />
                Novos ({composition.variablePct.toFixed(0)}%)
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                <Layers className="h-3 w-3 text-sky-400" />
                Parcelas ({composition.installmentPct.toFixed(0)}%)
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <Repeat className="h-3 w-3 text-emerald-400" />
                Fixas ({composition.fixedPct.toFixed(0)}%)
              </span>
            </div>
          </div>

          <div className="h-3 w-full rounded-full bg-white/[0.06] overflow-hidden flex">
            {composition.variablePct > 0 && (
              <div
                className="h-full bg-violet-500 transition-all duration-500"
                style={{ width: `${composition.variablePct}%` }}
                title={`Novos gastos: ${formatCurrency(activeSummary.variableAmount)}`}
              />
            )}
            {composition.installmentPct > 0 && (
              <div
                className="h-full bg-sky-500 transition-all duration-500"
                style={{ width: `${composition.installmentPct}%` }}
                title={`Parcelas: ${formatCurrency(activeSummary.installmentAmount)}`}
              />
            )}
            {composition.fixedPct > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${composition.fixedPct}%` }}
                title={`Fixas: ${formatCurrency(activeSummary.fixedAmount)}`}
              />
            )}
          </div>
        </div>
      )}

      {/* Gráfico por Categoria vs Orçamento */}
      {chartRows.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground border border-dashed border-white/10 rounded-2xl">
          Nenhum gasto lançado nesta fatura em aberto ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Gastos na Fatura vs. Orçamento da Categoria</h3>
              <p className="text-[11px] text-muted-foreground">
                Compare quanto a fatura aberta já consumiu do orçamento mensal de cada categoria
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                Fatura aberta
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-white/30" />
                Orçamento
              </span>
            </div>
          </div>

          <div style={{ height: chartHeight }} className="w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={chartRows}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  type="number"
                  tickFormatter={formatCompact}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fill: "var(--foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  content={<OpenInvoiceTooltip formatCurrency={formatCurrency} />}
                />
                <Bar dataKey="fatura" name="Fatura aberta" radius={[0, 6, 6, 0]} barSize={14}>
                  {chartRows.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.isOverBudget ? "#fb7185" : entry.isNearBudget ? "#fbbf24" : "var(--primary)"}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="orcamento"
                  name="Orçamento"
                  fill="rgba(255,255,255,0.28)"
                  radius={[0, 6, 6, 0]}
                  barSize={10}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Lista compacta com alertas de orçamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {chartRows.slice(0, 6).map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.025] border border-white/[0.06] px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground truncate">{row.name}</span>
                    {row.isOverBudget && <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {row.hasBudget
                      ? `${formatCurrency(row.fatura)} de ${formatCurrency(row.orcamento)}`
                      : `${formatCurrency(row.fatura)} • Sem orçamento`}
                  </span>
                </div>
                {row.hasBudget ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] shrink-0",
                      row.isOverBudget
                        ? "border-rose-500/40 text-rose-400 bg-rose-500/10"
                        : row.isNearBudget
                          ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                          : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
                    )}
                  >
                    {row.percentOfBudget.toFixed(0)}%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] shrink-0 border-white/10 text-muted-foreground">
                    {row.percentOfInvoice.toFixed(0)}% fatura
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
