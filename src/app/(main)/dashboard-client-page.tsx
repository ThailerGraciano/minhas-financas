"use client";

import { getDashboardFullData } from "@/app/actions/dashboard-full";
import { AccountBalancesSummary } from "@/components/account-balances-summary";
import { AccountsCarousel } from "@/components/accounts-carousel";
import { BalanceEvolutionChart, COLOR_FUTURE, COLOR_PAST } from "@/components/balance-evolution-chart";
import { CategoryForecastChart } from "@/components/category-forecast-chart";
import { ExpenseTreemap } from "@/components/charts/ExpenseTreemap";
import { IncomeTreemap } from "@/components/charts/IncomeTreemap";
import { ClientDataLoader } from "@/components/client-data-loader";
import { CreditCardInvoicesList } from "@/components/credit-card-invoices-list";
import { EmergencyReserveCard } from "@/components/emergency-reserve-card";
import { ExpenseTypeComparison } from "@/components/expense-type-comparison";
import { ExpensesForecastChart } from "@/components/expenses-forecast-chart";
import { GoalsStashBlock } from "@/components/goals-stash-block";
import { InstallmentsStackedChart } from "@/components/installments-stacked-chart";
import { MonthlyBalanceGrid } from "@/components/monthly-balance-grid";
import { MonthlyFinancialHealth } from "@/components/monthly-financial-health";
import {
  DASHBOARD_WIDGETS_META,
  getDashboardLayoutClientSnapshot,
  getDashboardLayoutServerSnapshot,
  isDefaultDashboardLayout,
  moveArrayItem,
  reorderWidgetsById,
  subscribeDashboardLayout,
  writeDashboardLayoutToStorage,
  type DashboardLayoutState,
  type DashboardWidgetConfig,
  type DashboardWidgetId,
  type WidgetColSpan,
} from "@/lib/dashboard-layout";
import { cn } from "@/lib/utils";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CreditCard as CreditCardIcon,
  Eye,
  EyeOff,
  Grid3X3,
  GripHorizontal,
  Layers,
  LayoutGrid,
  RotateCcw,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";

type DashboardFullData = Awaited<ReturnType<typeof getDashboardFullData>>;

const COL_SPAN_CLASSES: Record<WidgetColSpan, string> = {
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  6: "lg:col-span-6",
};

const COL_SPAN_LABELS: Array<{ span: WidgetColSpan; label: string }> = [
  { span: 2, label: "1/3" },
  { span: 3, label: "1/2" },
  { span: 4, label: "2/3" },
  { span: 6, label: "100%" },
];

const dashboardCollisionStrategy: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    return pointerHits;
  }
  return closestCenter(args);
};

interface SortableDashboardWidgetProps {
  config: DashboardWidgetConfig;
  index: number;
  totalVisible: number;
  isEditMode: boolean;
  isDraggingAny: boolean;
  onMoveByOffset: (id: DashboardWidgetId, offset: -1 | 1) => void;
  onChangeColSpan: (id: DashboardWidgetId, span: WidgetColSpan) => void;
  onToggleVisible: (id: DashboardWidgetId) => void;
  children: ReactNode;
}

function SortableDashboardWidget({
  config,
  index,
  totalVisible,
  isEditMode,
  isDraggingAny,
  onMoveByOffset,
  onChangeColSpan,
  onToggleVisible,
  children,
}: SortableDashboardWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: config.id,
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: config.id,
  });

  const meta = useMemo(
    () => DASHBOARD_WIDGETS_META.find((m) => m.id === config.id) ?? DASHBOARD_WIDGETS_META[0],
    [config.id],
  );

  const handleAttributes = {
    tabIndex: attributes.tabIndex,
    "aria-disabled": attributes["aria-disabled"],
    "aria-pressed": attributes["aria-pressed"],
    "aria-roledescription": attributes["aria-roledescription"],
    "aria-describedby": attributes["aria-describedby"],
  };

  return (
    <div
      ref={(node) => {
        setDraggableRef(node);
        setDroppableRef(node);
      }}
      className={cn(
        "dashboard-widget-cell group/widget relative col-span-1 flex flex-col min-w-0 transition-all duration-200",
        COL_SPAN_CLASSES[config.colSpan],
        isEditMode && "p-2.5 sm:p-3 rounded-[2rem] border-2 border-dashed border-primary/35 bg-primary/[0.02]",
        isDragging && "opacity-30 scale-[0.98]",
        isOver && !isDragging && "ring-2 ring-primary bg-primary/10 rounded-[2rem] shadow-xl",
      )}
    >
      {isEditMode ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 mb-2.5 rounded-2xl bg-secondary/90 border border-white/10 shadow-sm">
          <button
            type="button"
            {...handleAttributes}
            {...listeners}
            aria-label={`Arrastar ${meta.title}. Use as setas para reordenar pelo teclado`}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                e.preventDefault();
                onMoveByOffset(config.id, -1);
              } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                e.preventDefault();
                onMoveByOffset(config.id, 1);
              }
            }}
            className={cn(
              "drag-handle flex items-center gap-2 text-xs font-bold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl px-2 py-1 bg-background/60 border border-white/5",
              isDragging && "dragging",
            )}
          >
            <GripHorizontal className="w-4 h-4 text-primary shrink-0" />
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
              #{index + 1}
            </span>
            <span className="truncate max-w-[160px] sm:max-w-[240px]">{meta.title}</span>
          </button>

          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            {/* Seletor de largura em telas grandes (Desktop) */}
            <div
              className="hidden lg:flex items-center rounded-xl bg-background/70 p-0.5 border border-white/5"
              title="Largura do bloco no desktop"
            >
              {COL_SPAN_LABELS.map((item) => (
                <button
                  key={item.span}
                  type="button"
                  onClick={() => onChangeColSpan(config.id, item.span)}
                  className={cn(
                    "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer",
                    config.colSpan === item.span
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Botões de subir/descer */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMoveByOffset(config.id, -1)}
                title="Mover para cima / anterior"
                aria-label={`Mover ${meta.title} para posição anterior`}
                className="p-1.5 rounded-xl bg-background/70 hover:bg-background text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-white/5"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={index === totalVisible - 1}
                onClick={() => onMoveByOffset(config.id, 1)}
                title="Mover para baixo / próximo"
                aria-label={`Mover ${meta.title} para próxima posição`}
                className="p-1.5 rounded-xl bg-background/70 hover:bg-background text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-white/5"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Ocultar bloco */}
            <button
              type="button"
              onClick={() => onToggleVisible(config.id)}
              title="Ocultar este componente do dashboard"
              aria-label={`Ocultar ${meta.title}`}
              className="p-1.5 rounded-xl bg-background/70 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 cursor-pointer border border-white/5 transition-colors"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "absolute top-2 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-150",
            isDraggingAny
              ? "opacity-0 pointer-events-none"
              : "opacity-0 group-hover/widget:opacity-100 focus-within:opacity-100",
          )}
        >
          <button
            type="button"
            {...handleAttributes}
            {...listeners}
            aria-label={`Arrastar ${meta.title}. Use as setas para reordenar pelo teclado`}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                e.preventDefault();
                onMoveByOffset(config.id, -1);
              } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                e.preventDefault();
                onMoveByOffset(config.id, 1);
              }
            }}
            title={`Arraste para mover "${meta.title}" ou use as setas do teclado`}
            className={cn(
              "drag-handle flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/90 backdrop-blur-md border border-white/15 shadow-md text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isDragging && "dragging",
            )}
          >
            <GripHorizontal className="w-3.5 h-3.5 text-primary" />
            <span>Arrastar</span>
          </button>
        </div>
      )}

      {isOver && !isDragging && (
        <div className="absolute inset-x-0 top-4 flex justify-center z-30 pointer-events-none">
          <span className="px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg">
            Soltar &quot;{meta.title}&quot; aqui
          </span>
        </div>
      )}

      <div className="flex-1 h-full min-w-0 flex flex-col">{children}</div>
    </div>
  );
}

export function DashboardClientPage({
  closingDay,
  initialData,
}: {
  closingDay: number;
  initialData: DashboardFullData;
}) {
  const [dateMode, setDateMode] = useState<"due_date" | "launch_date">("due_date");
  const [showBalance, setShowBalance] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const layout = useSyncExternalStore(
    subscribeDashboardLayout,
    getDashboardLayoutClientSnapshot,
    getDashboardLayoutServerSnapshot,
  );
  const [activeDragId, setActiveDragId] = useState<DashboardWidgetId | null>(null);

  const persistLayout = useCallback((updater: (prev: DashboardLayoutState) => DashboardLayoutState) => {
    const current = getDashboardLayoutClientSnapshot();
    const next = updater(current);
    writeDashboardLayoutToStorage(next);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 6,
      },
    }),
  );

  const isCustomLayout = useMemo(() => !isDefaultDashboardLayout(layout), [layout]);

  const handleResetLayout = useCallback(() => {
    writeDashboardLayoutToStorage(null);
    toast.success("Layout do dashboard restaurado para o padrão.");
  }, []);

  const handleMoveWidgetByOffset = useCallback(
    (id: DashboardWidgetId, offset: -1 | 1) => {
      persistLayout((prev) => {
        const visibleIds = prev.widgets.filter((w) => w.visible).map((w) => w.id);
        const visiblePos = visibleIds.indexOf(id);
        const targetVisiblePos = visiblePos + offset;
        if (visiblePos < 0 || targetVisiblePos < 0 || targetVisiblePos >= visibleIds.length) {
          return prev;
        }
        const targetId = visibleIds[targetVisiblePos];
        return {
          ...prev,
          widgets: reorderWidgetsById(prev.widgets, id, targetId),
        };
      });
    },
    [persistLayout],
  );

  const handleChangeColSpan = useCallback(
    (id: DashboardWidgetId, colSpan: WidgetColSpan) => {
      persistLayout((prev) => ({
        ...prev,
        widgets: prev.widgets.map((w) => (w.id === id ? { ...w, colSpan } : w)),
      }));
    },
    [persistLayout],
  );

  const handleToggleWidgetVisible = useCallback(
    (id: DashboardWidgetId) => {
      persistLayout((prev) => {
        const current = prev.widgets.find((w) => w.id === id);
        if (!current) return prev;
        const visibleCount = prev.widgets.filter((w) => w.visible).length;
        if (current.visible && visibleCount <= 1) {
          toast.error("Mantenha pelo menos um componente visível no dashboard.");
          return prev;
        }
        const meta = DASHBOARD_WIDGETS_META.find((m) => m.id === id);
        const nextVisible = !current.visible;
        if (meta) {
          toast.info(
            nextVisible
              ? `"${meta.title}" exibido novamente no dashboard.`
              : `"${meta.title}" ocultado. Você pode reativá-lo no painel Organizar.`,
          );
        }
        return {
          ...prev,
          widgets: prev.widgets.map((w) => (w.id === id ? { ...w, visible: nextVisible } : w)),
        };
      });
    },
    [persistLayout],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id) as DashboardWidgetId);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const draggedId = String(event.active.id) as DashboardWidgetId;
      setActiveDragId(null);

      if (!event.over) return;
      const overId = String(event.over.id) as DashboardWidgetId;
      if (draggedId === overId) return;

      persistLayout((prev) => {
        const fromIndex = prev.widgets.findIndex((w) => w.id === draggedId);
        const toIndex = prev.widgets.findIndex((w) => w.id === overId);
        if (fromIndex < 0 || toIndex < 0) return prev;
        return {
          ...prev,
          widgets: moveArrayItem(prev.widgets, fromIndex, toIndex),
        };
      });

      const draggedMeta = DASHBOARD_WIDGETS_META.find((m) => m.id === draggedId);
      if (draggedMeta) {
        toast.success(`"${draggedMeta.title}" reposicionado e salvo.`);
      }
    },
    [persistLayout],
  );

  const activeDragMeta = useMemo(
    () => (activeDragId ? (DASHBOARD_WIDGETS_META.find((m) => m.id === activeDragId) ?? null) : null),
    [activeDragId],
  );

  const activeDragConfig = useMemo(
    () => (activeDragId ? (layout.widgets.find((w) => w.id === activeDragId) ?? null) : null),
    [activeDragId, layout.widgets],
  );

  const fetchAction = useCallback((month: string) => getDashboardFullData(month, dateMode), [dateMode]);

  return (
    <ClientDataLoader
      closingDay={closingDay}
      initialData={initialData}
      fetchAction={fetchAction}
      headerContent={<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>}
      headerActions={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center rounded-full bg-secondary p-1 text-xs border border-white/5">
            <button
              type="button"
              onClick={() => setDateMode("due_date")}
              className={cn(
                "px-3 py-1 rounded-full font-medium transition-all text-xs cursor-pointer",
                dateMode === "due_date"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Vencimento (Caixa)
            </button>
            <button
              type="button"
              onClick={() => setDateMode("launch_date")}
              className={cn(
                "px-3 py-1 rounded-full font-medium transition-all text-xs cursor-pointer",
                dateMode === "launch_date"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Lançamento (Consumo)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsEditMode((prev) => !prev)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border shadow-sm",
              isEditMode
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-secondary text-foreground hover:bg-secondary/80 border-white/5",
            )}
            title="Arrastar, redimensionar e organizar os gráficos e componentes do Dashboard"
          >
            {isEditMode ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Concluir</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                <span>Organizar</span>
                {isCustomLayout && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-primary inline-block"
                    title="Layout personalizado ativo"
                  />
                )}
              </>
            )}
          </button>
        </div>
      }
    >
      {(dashboard, selectedMonth) => {
        // Separação de contas operacionais vs caixinhas para não duplicar no AccountsCarousel
        const operationalAccounts = dashboard.data.accounts.filter((a) => {
          const lower = a.name.toLowerCase();
          return (
            a.type !== "stash" &&
            !lower.includes("reserva") &&
            !lower.includes("carro") &&
            !lower.includes("casa") &&
            !lower.includes("viagem") &&
            !lower.includes("meta")
          );
        });

        const carouselAccounts = operationalAccounts.length > 0 ? operationalAccounts : dashboard.data.accounts;
        const hasStashAccounts = Boolean(dashboard.data.stashAccounts && dashboard.data.stashAccounts.length > 0);
        const hasCarouselAccounts = Boolean(carouselAccounts && carouselAccounts.length > 0);

        const visibleWidgets = layout.widgets.filter((w) => {
          if (!w.visible) return false;
          if (!isEditMode && w.id === "accounts-carousel" && !hasCarouselAccounts) return false;
          if (!isEditMode && w.id === "goals-stash" && !hasStashAccounts) return false;
          return true;
        });

        const hiddenCount = layout.widgets.filter((w) => !w.visible).length;

        const renderWidgetContent = (widgetId: DashboardWidgetId): ReactNode => {
          switch (widgetId) {
            case "health-summary":
              return (
                <MonthlyFinancialHealth
                  totalIncome={dashboard.data.totalIncome}
                  totalExpense={dashboard.data.totalExpense}
                  expenseBreakdown={dashboard.data.expenseBreakdown}
                  showBalance={showBalance}
                />
              );

            case "balance-summary":
              return (
                <AccountBalancesSummary
                  totalBalance={dashboard.balancesData.totalBalance}
                  balancesByType={dashboard.balancesData.balancesByType}
                  showBalance={showBalance}
                  onToggleShowBalance={() => setShowBalance(!showBalance)}
                />
              );

            case "emergency-reserve":
              return <EmergencyReserveCard reserveData={dashboard.data.reserveData} showBalance={showBalance} />;

            case "monthly-totals":
              return (
                <MonthlyBalanceGrid
                  totalIncome={dashboard.data.totalIncome}
                  totalExpense={dashboard.data.totalExpense}
                  showBalance={showBalance}
                />
              );

            case "accounts-carousel":
              if (!hasCarouselAccounts) {
                return (
                  <div className="bg-card/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] p-6 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] text-center text-xs text-muted-foreground relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    Nenhuma conta operacional cadastrada no momento.
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl font-bold text-foreground">Minhas Contas & Caixas</h2>
                    <Link href="/accounts" className="text-xs text-primary font-medium hover:underline">
                      Ver todas
                    </Link>
                  </div>
                  <AccountsCarousel accounts={carouselAccounts} showBalance={showBalance} />
                </div>
              );

            case "balance-evolution":
              return (
                <div className="bg-card/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] w-full min-w-0 h-full flex flex-col justify-between relative overflow-hidden">
                  {/* Specular top highlight */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="flex flex-row items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <h2 className="text-xl font-bold">Evolução de Saldo</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Histórico dos últimos 6 meses e projeção para os próximos 6
                      </p>
                    </div>
                  </div>
                  <div>
                    <BalanceEvolutionChart data={dashboard.evolutionData} showBalance={showBalance} />
                    <div className="flex items-center gap-6 mt-3 px-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-block w-6 h-1 rounded" style={{ background: COLOR_PAST }} />
                        Saldo real
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <svg width="24" height="4" aria-hidden="true">
                          <line
                            x1="0"
                            y1="2"
                            x2="24"
                            y2="2"
                            stroke={COLOR_FUTURE}
                            strokeWidth="2"
                            strokeDasharray="6 4"
                          />
                        </svg>
                        Projeção
                      </div>
                    </div>
                  </div>
                </div>
              );

            case "expense-composition":
              return (
                <ExpenseTypeComparison
                  data={dashboard.forecastData}
                  selectedMonth={selectedMonth}
                  showBalance={showBalance}
                />
              );

            case "expenses-forecast":
              return (
                <div className="bg-card/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] w-full min-w-0 h-full flex flex-col justify-between relative overflow-hidden">
                  {/* Specular top highlight */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="flex flex-row items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <h2 className="text-xl font-bold">Previsão de Gastos</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Projeção de despesas variáveis, fixas e parceladas para os próximos 6 meses
                      </p>
                    </div>
                  </div>
                  <div>
                    <ExpensesForecastChart data={dashboard.forecastData} showBalance={showBalance} />
                  </div>
                </div>
              );

            case "expense-treemap":
              return (
                <div className="bg-card/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] w-full min-w-0 h-full flex flex-col justify-between relative overflow-hidden">
                  {/* Specular top highlight */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="flex flex-row items-center gap-2 mb-4">
                    <Grid3X3 className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <h2 className="text-xl font-bold">Mapeamento de Despesas</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Distribuição proporcional de gastos por categoria neste mês
                      </p>
                    </div>
                  </div>
                  <ExpenseTreemap data={dashboard.treemapData} showBalance={showBalance} />
                </div>
              );

            case "income-treemap":
              return (
                <div className="bg-card/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] w-full min-w-0 h-full flex flex-col justify-between relative overflow-hidden">
                  {/* Specular top highlight */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="flex flex-row items-center gap-2 mb-4">
                    <Grid3X3 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <h2 className="text-xl font-bold">Mapeamento de Receitas</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Distribuição proporcional de receitas por categoria neste mês
                      </p>
                    </div>
                  </div>
                  <IncomeTreemap data={dashboard.incomeTreemapData} showBalance={showBalance} />
                </div>
              );

            case "open-invoices":
              return (
                <div className="bg-card/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] w-full min-w-0 h-full flex flex-col justify-between relative overflow-hidden">
                  {/* Specular top highlight */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="flex flex-row items-center gap-2 mb-6">
                    <CreditCardIcon className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <h2 className="text-xl font-bold">Faturas Abertas</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Acompanhe os gastos e limites dos seus cartões de crédito neste mês
                      </p>
                    </div>
                  </div>
                  <CreditCardInvoicesList invoices={dashboard.data.cardInvoices} showBalance={showBalance} />
                </div>
              );

            case "installments-projection":
              return (
                <div className="bg-card/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] w-full min-w-0 h-full flex flex-col justify-between relative overflow-hidden">
                  {/* Specular top highlight */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="flex flex-row items-center gap-2 mb-4">
                    <Layers className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <h2 className="text-xl font-bold">Projeção de Parcelamentos</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Acúmulo de faturas com compras parceladas e momentos de alívio
                      </p>
                    </div>
                  </div>
                  <div>
                    <InstallmentsStackedChart
                      data={dashboard.installmentsData.data}
                      keys={dashboard.installmentsData.keys}
                      showBalance={showBalance}
                    />
                  </div>
                </div>
              );

            case "goals-stash":
              if (!hasStashAccounts) {
                return (
                  <div className="bg-card/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] p-6 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] flex items-center gap-3 text-xs text-muted-foreground relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <Target className="w-5 h-5 text-primary shrink-0" />
                    <span>
                      Nenhuma caixinha ou meta cadastrada neste período. Este bloco fica oculto automaticamente fora do
                      modo Organizar.
                    </span>
                  </div>
                );
              }
              return <GoalsStashBlock stashAccounts={dashboard.data.stashAccounts} showBalance={showBalance} />;

            case "category-forecast":
              return (
                <div className="bg-card/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] px-4 py-6 sm:p-6 border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] w-full min-w-0 h-full flex flex-col justify-between relative overflow-hidden">
                  {/* Specular top highlight */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="flex flex-row items-center gap-2 mb-4">
                    <Grid3X3 className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <h2 className="text-xl font-bold">Previsão por Categoria</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Projeção de despesas categorizadas para os próximos 6 meses (clique na legenda para filtrar)
                      </p>
                    </div>
                  </div>
                  <div>
                    <CategoryForecastChart
                      data={dashboard.categoryForecastData.data}
                      keys={dashboard.categoryForecastData.keys}
                      showBalance={showBalance}
                    />
                  </div>
                </div>
              );
          }
        };

        return (
          <div className="space-y-6 mt-6">
            {/* Painel de Personalização do Layout (Modo Organizar) */}
            {isEditMode && (
              <div className="rounded-3xl bg-card/95 border border-primary/30 p-4 sm:p-5 shadow-lg space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/25">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-bold text-foreground">
                          Personalizar Layout do Dashboard
                        </h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                          Salvo automaticamente no navegador
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Arraste qualquer gráfico ou cartão pela alça superior para mudar a posição, ajuste a largura no
                        desktop (1/3, 1/2, 2/3, 100%) ou escolha quais blocos exibir.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={handleResetLayout}
                      disabled={!isCustomLayout}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restaurar padrão</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:brightness-110 transition-all cursor-pointer shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Concluir</span>
                    </button>
                  </div>
                </div>

                {/* Lista rápida de visibilidade de todos os componentes */}
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Componentes do Dashboard ({layout.widgets.length - hiddenCount} visíveis
                      {hiddenCount > 0 ? `, ${hiddenCount} oculto(s)` : ""})
                    </span>
                    <span className="text-[11px]">Clique para mostrar ou ocultar</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {layout.widgets.map((w, idx) => {
                      const meta = DASHBOARD_WIDGETS_META.find((m) => m.id === w.id);
                      if (!meta) return null;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => handleToggleWidgetVisible(w.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer",
                            w.visible
                              ? "bg-primary/10 text-foreground border-primary/30 hover:bg-primary/20"
                              : "bg-secondary/50 text-muted-foreground border-white/5 opacity-60 hover:opacity-100",
                          )}
                        >
                          {w.visible ? (
                            <Eye className="w-3 h-3 text-primary shrink-0" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                          <span>{meta.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <DndContext
              id="dashboard-dnd-context"
              sensors={sensors}
              collisionDetection={dashboardCollisionStrategy}
              onDragStart={handleDragStart}
              onDragCancel={handleDragCancel}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 items-stretch">
                {visibleWidgets.map((widgetConfig, idx) => (
                  <SortableDashboardWidget
                    key={widgetConfig.id}
                    config={widgetConfig}
                    index={idx}
                    totalVisible={visibleWidgets.length}
                    isEditMode={isEditMode}
                    isDraggingAny={activeDragId !== null}
                    onMoveByOffset={handleMoveWidgetByOffset}
                    onChangeColSpan={handleChangeColSpan}
                    onToggleVisible={handleToggleWidgetVisible}
                  >
                    {renderWidgetContent(widgetConfig.id)}
                  </SortableDashboardWidget>
                ))}
              </div>

              <DragOverlay dropAnimation={null}>
                {activeDragMeta && activeDragConfig ? (
                  <div className="rounded-3xl border-2 border-primary bg-card/95 backdrop-blur-md p-4 shadow-2xl min-w-[240px] max-w-[340px] pointer-events-none">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripHorizontal className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-bold text-sm text-foreground truncate">{activeDragMeta.title}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary shrink-0">
                        {COL_SPAN_LABELS.find((c) => c.span === activeDragConfig.colSpan)?.label ?? "100%"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{activeDragMeta.description}</p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        );
      }}
    </ClientDataLoader>
  );
}
