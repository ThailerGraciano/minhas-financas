"use client";

import type { CategoryBudgetHierarchy } from "@/app/actions/budgets";
import { getWidgetFullData } from "@/app/actions/widget";
import { BalanceEvolutionChart, COLOR_FUTURE, COLOR_PAST } from "@/components/balance-evolution-chart";
import { CategoryIcon } from "@/components/category-icon";
import { MonthlyFinancialHealth } from "@/components/monthly-financial-health";
import { TransactionFormDialog } from "@/components/transaction-form-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Smartphone,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type WidgetFullData = Awaited<ReturnType<typeof getWidgetFullData>>;
type WidgetView = "budgets" | "health" | "evolution";

const STORAGE_KEY_VIEW = "mf_android_widget_view";
const STORAGE_KEY_PRIVACY = "mf_android_widget_show_balance";

function isValidView(value: string | null): value is WidgetView {
  return value === "budgets" || value === "health" || value === "evolution";
}

export function WidgetClientPage({ initialData }: { initialData: WidgetFullData }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [widgetData, setWidgetData] = useState<WidgetFullData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const savedPrivacy = window.localStorage.getItem(STORAGE_KEY_PRIVACY);
      if (savedPrivacy !== null) return savedPrivacy === "true";
    }
    return true;
  });
  const [selectedView, setSelectedView] = useState<WidgetView>(() => {
    const paramView = searchParams.get("view");
    if (isValidView(paramView)) return paramView;
    if (typeof window !== "undefined") {
      const savedView = window.localStorage.getItem(STORAGE_KEY_VIEW);
      if (isValidView(savedView)) return savedView;
    }
    return "budgets";
  });
  const [onlyBudgeted, setOnlyBudgeted] = useState(false);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<number, boolean>>({});
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const paramView = searchParams.get("view");
  const activeView: WidgetView = isValidView(paramView) ? paramView : selectedView;

  const expenseTriggerRef = useRef<HTMLButtonElement | null>(null);
  const incomeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const transferTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Suporte a abertura imediata do modal de transação via ?action=new-expense | new-income | new-transfer
  const actionParam = searchParams.get("action");
  useEffect(() => {
    if (!actionParam) return;

    const timer = window.setTimeout(() => {
      if (actionParam === "new-expense") expenseTriggerRef.current?.click();
      else if (actionParam === "new-income") incomeTriggerRef.current?.click();
      else if (actionParam === "new-transfer") transferTriggerRef.current?.click();

      const params = new URLSearchParams(searchParams.toString());
      params.delete("action");
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [actionParam, pathname, router, searchParams]);

  const handleSelectView = (nextView: WidgetView) => {
    setSelectedView(nextView);
    window.localStorage.setItem(STORAGE_KEY_VIEW, nextView);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextView);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleToggleBalance = () => {
    const next = !showBalance;
    setShowBalance(next);
    window.localStorage.setItem(STORAGE_KEY_PRIVACY, String(next));
  };

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const fresh = await getWidgetFullData(widgetData.month);
      setWidgetData(fresh);
    } catch {
      toast.error("Não foi possível atualizar os dados do widget.");
    } finally {
      setIsRefreshing(false);
    }
  }, [widgetData.month]);

  const formatCurrency = (value: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const copyWidgetLink = async (view: WidgetView) => {
    const url = `${window.location.origin}/widget?view=${view}`;
    await navigator.clipboard.writeText(url);
    setCopiedUrl(view);
    toast.success("Link do widget copiado!");
    window.setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Filtra e ordena categorias para a visão de Orçamentos por Categoria
  const displayedCategories = useMemo(() => {
    const list = widgetData.budgetData.categories.filter((cat) => {
      if (onlyBudgeted) return cat.limit > 0;
      return cat.limit > 0 || cat.consumed > 0;
    });

    return [...list].sort((a, b) => {
      // Prioriza categorias com limite definido ordenadas por maior percentual consumido
      if (a.limit > 0 && b.limit === 0) return -1;
      if (a.limit === 0 && b.limit > 0) return 1;
      if (a.limit > 0 && b.limit > 0) {
        return b.percent - a.percent || b.consumed - a.consumed;
      }
      return b.consumed - a.consumed;
    });
  }, [widgetData.budgetData.categories, onlyBudgeted]);

  const totalBudgetLimit = useMemo(
    () => widgetData.budgetData.categories.reduce((acc, cat) => acc + cat.limit, 0),
    [widgetData.budgetData.categories],
  );

  const totalBudgetConsumed = useMemo(
    () => widgetData.budgetData.categories.reduce((acc, cat) => acc + cat.consumed, 0),
    [widgetData.budgetData.categories],
  );

  const overallBudgetPercent =
    totalBudgetLimit > 0 ? (totalBudgetConsumed / totalBudgetLimit) * 100 : totalBudgetConsumed > 0 ? 100 : 0;

  const toggleExpandCategory = (id: number) => {
    setExpandedCategoryIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-[#0B0B10] text-foreground p-2.5 sm:p-4 flex flex-col gap-3 max-w-xl mx-auto select-none">
      {/* =========================================================
          1. HEADER COMPACTO + ACESSO RÁPIDO A TRANSAÇÃO (1 TOQUE)
         ========================================================= */}
      <div className="bg-card rounded-3xl border border-white/5 p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Saldo Operacional
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-primary/25 bg-primary/10 text-primary font-semibold"
              >
                {widgetData.month}
              </Badge>
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground tabular-nums truncate mt-0.5">
              {formatCurrency(widgetData.balancesData.totalBalance)}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleToggleBalance}
              aria-label={showBalance ? "Ocultar valores" : "Mostrar valores"}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={refreshData}
              disabled={isRefreshing}
              aria-label="Atualizar widget"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-primary")} />
            </button>

            {/* Guia de Configuração no Android */}
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label="Como adicionar widget no Android"
                  className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#1A1A22] border-white/10 text-white max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-bold">
                    <Smartphone className="w-5 h-5 text-primary" />
                    Usar como Widget no Android
                  </DialogTitle>
                  <DialogDescription className="text-xs text-white/60">
                    Configure atalhos de 1 toque e gráficos interativos na tela inicial do seu celular.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-xs leading-relaxed">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <p className="font-bold text-white">1. Widget com Gráfico na Tela Inicial</p>
                    <p className="text-white/70">
                      Instale um app gratuito de Web Widget na Play Store (ex:{" "}
                      <span className="text-white font-medium">Web Widget</span> ou{" "}
                      <span className="text-white font-medium">Website Shortcut</span>) e cole um dos links abaixo:
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {(
                        [
                          { id: "budgets", label: "Orçamentos por Categoria" },
                          { id: "health", label: "Saúde Financeira do Mês" },
                          { id: "evolution", label: "Evolução de Saldo" },
                        ] as const
                      ).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#121217] border border-white/5"
                        >
                          <div className="truncate">
                            <span className="font-semibold text-white block">{item.label}</span>
                            <span className="text-[10px] text-white/45 font-mono">/widget?view={item.id}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyWidgetLink(item.id)}
                            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedUrl === item.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copiar
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                    <p className="font-bold text-white">2. Botões Diretos de Nova Transação (PWA)</p>
                    <p className="text-white/70">
                      Com o site instalado no Android (<span className="text-white">Adicionar à tela inicial</span> no
                      Chrome), <strong>segure o dedo sobre o ícone do app</strong> e arraste os atalhos{" "}
                      <span className="text-rose-400 font-semibold">Nova Despesa</span> ou{" "}
                      <span className="text-emerald-400 font-semibold">Nova Receita</span> direto para a sua tela
                      inicial!
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Link
              href="/"
              aria-label="Abrir Dashboard Completo"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Botões de Acesso Rápido a Transação */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <TransactionFormDialog
            initialTab="expense"
            onSuccess={refreshData}
            trigger={
              <button
                ref={expenseTriggerRef}
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-rose-500/12 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 shrink-0" />
                <span>Despesa</span>
              </button>
            }
          />

          <TransactionFormDialog
            initialTab="income"
            onSuccess={refreshData}
            trigger={
              <button
                ref={incomeTriggerRef}
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-emerald-500/12 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4 shrink-0" />
                <span>Receita</span>
              </button>
            }
          />

          <TransactionFormDialog
            initialTab="transfer"
            onSuccess={refreshData}
            trigger={
              <button
                ref={transferTriggerRef}
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-blue-500/12 hover:bg-blue-500/20 border border-blue-500/25 text-blue-400 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4 shrink-0" />
                <span>Transferir</span>
              </button>
            }
          />
        </div>
      </div>

      {/* =========================================================
          2. SELETOR DO GRÁFICO / VISÃO DO WIDGET
         ========================================================= */}
      <div className="grid grid-cols-3 gap-1.5 bg-card p-1.5 rounded-2xl border border-white/5">
        <button
          type="button"
          onClick={() => handleSelectView("budgets")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            activeView === "budgets"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5",
          )}
        >
          <Target className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Orçamentos</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectView("health")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            activeView === "health"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5",
          )}
        >
          <Activity className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Saúde do Mês</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectView("evolution")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            activeView === "evolution"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5",
          )}
        >
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Evolução</span>
        </button>
      </div>

      {/* =========================================================
          3. CONTEÚDO DO GRÁFICO ESCOLHIDO
         ========================================================= */}
      {activeView === "budgets" && (
        <div className="bg-card rounded-3xl border border-white/5 p-4 shadow-sm space-y-4">
          {/* Cabeçalho e Resumo Geral dos Orçamentos */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Orçamentos por Categoria</h2>
                <p className="text-[11px] text-muted-foreground">Valores alcançados vs limites do mês</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOnlyBudgeted(!onlyBudgeted)}
              className={cn(
                "text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors cursor-pointer",
                onlyBudgeted
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-white/5 text-muted-foreground border-white/10 hover:text-foreground",
              )}
            >
              {onlyBudgeted ? "Só orçadas" : "Todas ativas"}
            </button>
          </div>

          {/* Barra Global do Orçamento */}
          {totalBudgetLimit > 0 && (
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Total Alcançado</span>
                <div className="tabular-nums font-bold">
                  <span
                    className={cn(
                      overallBudgetPercent >= 100
                        ? "text-rose-400"
                        : overallBudgetPercent >= 80
                          ? "text-amber-400"
                          : "text-emerald-400",
                    )}
                  >
                    {formatCurrency(totalBudgetConsumed)}
                  </span>{" "}
                  <span className="text-muted-foreground font-normal">/ {formatCurrency(totalBudgetLimit)}</span>
                </div>
              </div>

              <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    overallBudgetPercent >= 100
                      ? "bg-rose-500"
                      : overallBudgetPercent >= 80
                        ? "bg-amber-500"
                        : "bg-emerald-500",
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, overallBudgetPercent))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{overallBudgetPercent.toFixed(1)}% do orçamento total</span>
                <span>
                  {totalBudgetLimit >= totalBudgetConsumed
                    ? `Disponível: ${formatCurrency(totalBudgetLimit - totalBudgetConsumed)}`
                    : `Excedido: ${formatCurrency(totalBudgetConsumed - totalBudgetLimit)}`}
                </span>
              </div>
            </div>
          )}

          {/* Lista de Categorias e Barras de Progresso */}
          {displayedCategories.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Nenhum orçamento ou gasto categorizado encontrado neste mês.
              </p>
              <Link
                href="/budgets"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                Configurar Orçamentos
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedCategories.map((cat) => (
                <CategoryBudgetWidgetCard
                  key={cat.id}
                  category={cat}
                  showBalance={showBalance}
                  isExpanded={Boolean(expandedCategoryIds[cat.id])}
                  onToggleExpand={() => toggleExpandCategory(cat.id)}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === "health" && (
        <MonthlyFinancialHealth
          totalIncome={widgetData.dashboardData.totalIncome}
          totalExpense={widgetData.dashboardData.totalExpense}
          expenseBreakdown={widgetData.dashboardData.expenseBreakdown}
          showBalance={showBalance}
        />
      )}

      {activeView === "evolution" && (
        <div className="bg-card rounded-3xl border border-white/5 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Evolução de Saldo</h2>
              <p className="text-[11px] text-muted-foreground">Histórico de 6 meses e projeção futura</p>
            </div>
          </div>

          <BalanceEvolutionChart data={widgetData.evolutionData} showBalance={showBalance} />

          <div className="flex items-center gap-5 pt-1 px-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-5 h-1 rounded" style={{ background: COLOR_PAST }} />
              Saldo real
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <svg width="20" height="4" aria-hidden="true">
                <line x1="0" y1="2" x2="20" y2="2" stroke={COLOR_FUTURE} strokeWidth="2" strokeDasharray="5 3" />
              </svg>
              Projeção
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryBudgetWidgetCard({
  category,
  showBalance,
  isExpanded,
  onToggleExpand,
  formatCurrency,
}: {
  category: CategoryBudgetHierarchy;
  showBalance: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  formatCurrency: (val: number) => string;
}) {
  const hasLimit = category.limit > 0;
  const percent = hasLimit ? (category.consumed / category.limit) * 100 : category.consumed > 0 ? 100 : 0;
  const remaining = category.limit - category.consumed;
  const hasSubcategories = category.subcategories.some((sub) => sub.limit > 0 || sub.consumed > 0);

  const barColor =
    !hasLimit
      ? "bg-blue-500"
      : percent >= 100
        ? "bg-rose-500"
        : percent >= 75
          ? "bg-amber-500"
          : "bg-emerald-500";

  const textColor =
    !hasLimit
      ? "text-blue-400"
      : percent >= 100
        ? "text-rose-400"
        : percent >= 75
          ? "text-amber-400"
          : "text-emerald-400";

  return (
    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 transition-colors hover:bg-white/[0.04]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-primary shrink-0">
            <CategoryIcon name={category.icon} className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground truncate">{category.name}</span>
              {hasLimit && (
                <span className={cn("text-[11px] font-black tabular-nums", textColor)}>
                  {percent.toFixed(0)}%
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground tabular-nums truncate">
              <span className="font-semibold text-foreground">{formatCurrency(category.consumed)}</span>
              {hasLimit ? (
                <span> de {formatCurrency(category.limit)}</span>
              ) : (
                <span className="text-white/40"> (sem teto definido)</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasLimit && (
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block">
                {remaining >= 0 ? "Resta" : "Excedeu"}
              </span>
              <span
                className={cn(
                  "text-xs font-bold tabular-nums",
                  remaining >= 0 ? "text-emerald-400" : "text-rose-400",
                )}
              >
                {showBalance ? formatCurrency(Math.abs(remaining)) : "••••••"}
              </span>
            </div>
          )}

          {hasSubcategories && (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-label="Expandir subcategorias"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Barra de Progresso da Categoria */}
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>

      {/* Subcategorias expansíveis */}
      {isExpanded && hasSubcategories && (
        <div className="pt-2 mt-2 border-t border-white/5 space-y-2 pl-2">
          {category.subcategories
            .filter((sub) => sub.limit > 0 || sub.consumed > 0)
            .map((sub) => {
              const subHasLimit = sub.limit > 0;
              const subPercent = subHasLimit ? (sub.consumed / sub.limit) * 100 : 100;
              return (
                <div key={sub.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] gap-2">
                    <span className="text-muted-foreground truncate">{sub.name}</span>
                    <span className="tabular-nums font-medium text-foreground shrink-0">
                      {formatCurrency(sub.consumed)}
                      {subHasLimit && (
                        <span className="text-muted-foreground"> / {formatCurrency(sub.limit)}</span>
                      )}
                    </span>
                  </div>
                  {subHasLimit && (
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          subPercent >= 100
                            ? "bg-rose-500"
                            : subPercent >= 75
                              ? "bg-amber-500"
                              : "bg-emerald-500",
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, subPercent))}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
