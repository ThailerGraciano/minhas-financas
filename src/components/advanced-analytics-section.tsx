"use client";

import { AccountIncomeExpenseChart } from "@/components/account-income-expense-chart";
import { AccountVsGlobalExpenseChart } from "@/components/account-vs-global-expense-chart";
import { GlobalIncomeExpenseChart } from "@/components/global-income-expense-chart";
import { PurchasingPowerChart } from "@/components/purchasing-power-chart";
import { Button } from "@/components/ui/button";
import {
  ADVANCED_CHARTS_META,
  DEFAULT_ADVANCED_CHARTS_ORDER,
  moveArrayItem,
  type AdvancedChartId,
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
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, GripHorizontal, LineChart } from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

interface AdvancedAnalyticsSectionProps {
  incomeVsExpenseData: {
    global: { name: string; income: number; expense: number; baseBalance?: number };
    byAccount: Array<{ accountName: string; income: number; expense: number; baseBalance: number }>;
    accountVsGlobal: Array<{ accountName: string; income: number; expense: number; globalExpense: number }>;
  };
  selectedMonth: string;
  chartsOrder?: AdvancedChartId[];
  onReorderCharts?: (newOrder: AdvancedChartId[]) => void;
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
  isEditMode?: boolean;
}

const advancedCollisionStrategy: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  return closestCenter(args);
};

interface SortableAdvancedChartItemProps {
  id: AdvancedChartId;
  index: number;
  total: number;
  isEditMode: boolean;
  isDraggingAny: boolean;
  onMoveByOffset: (id: AdvancedChartId, offset: -1 | 1) => void;
  children: ReactNode;
}

function SortableAdvancedChartItem({
  id,
  index,
  total,
  isEditMode,
  isDraggingAny,
  onMoveByOffset,
  children,
}: SortableAdvancedChartItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id,
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id,
  });

  const meta = ADVANCED_CHARTS_META[id];
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
        "dashboard-widget-cell group/adv-chart relative rounded-2xl transition-all duration-200 min-w-0 flex flex-col",
        isEditMode && "p-2 rounded-3xl border border-dashed border-primary/35 bg-primary/[0.02]",
        isDragging && "opacity-35 scale-[0.98]",
        isOver && !isDragging && "ring-2 ring-primary bg-primary/10 shadow-lg",
      )}
    >
      {isEditMode ? (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 mb-2 rounded-xl bg-secondary/80 border border-white/10">
          <button
            type="button"
            {...handleAttributes}
            {...listeners}
            aria-label={`Arrastar gráfico ${meta.title}. Use as setas para reordenar pelo teclado`}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                e.preventDefault();
                onMoveByOffset(id, -1);
              } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                e.preventDefault();
                onMoveByOffset(id, 1);
              }
            }}
            className={cn(
              "drag-handle flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-1.5 py-0.5",
              isDragging && "dragging",
            )}
          >
            <GripHorizontal className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{meta.title}</span>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMoveByOffset(id, -1)}
              title="Mover gráfico para trás"
              aria-label={`Mover ${meta.title} para trás`}
              className="p-1 rounded-lg bg-background/70 hover:bg-background text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-white/5"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={() => onMoveByOffset(id, 1)}
              title="Mover gráfico para frente"
              aria-label={`Mover ${meta.title} para frente`}
              className="p-1 rounded-lg bg-background/70 hover:bg-background text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-white/5"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "absolute top-2 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-150",
            isDraggingAny
              ? "opacity-0 pointer-events-none"
              : "opacity-0 group-hover/adv-chart:opacity-100 focus-within:opacity-100",
          )}
        >
          <button
            type="button"
            {...handleAttributes}
            {...listeners}
            aria-label={`Arrastar gráfico ${meta.title}. Use as setas para reordenar pelo teclado`}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                e.preventDefault();
                onMoveByOffset(id, -1);
              } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                e.preventDefault();
                onMoveByOffset(id, 1);
              }
            }}
            title={`Arraste para reordenar "${meta.title}"`}
            className={cn(
              "drag-handle flex items-center gap-1 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-md border border-white/15 shadow-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isDragging && "dragging",
            )}
          >
            <GripHorizontal className="w-3.5 h-3.5 text-primary" />
            <span>Arrastar</span>
          </button>
        </div>
      )}

      {isOver && !isDragging && (
        <div className="absolute inset-x-0 top-3 flex justify-center z-30 pointer-events-none">
          <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg">
            Soltar gráfico aqui
          </span>
        </div>
      )}

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function AdvancedAnalyticsSection({
  incomeVsExpenseData,
  selectedMonth,
  chartsOrder,
  onReorderCharts,
  isOpen: controlledIsOpen,
  onToggleOpen,
  isEditMode = false,
}: AdvancedAnalyticsSectionProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [activeChartDrag, setActiveChartDrag] = useState<AdvancedChartId | null>(null);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const order = chartsOrder ?? [...DEFAULT_ADVANCED_CHARTS_ORDER];

  const handleToggle = () => {
    const next = !isOpen;
    if (onToggleOpen) {
      onToggleOpen(next);
    } else {
      setInternalIsOpen(next);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  );

  const handleMoveByOffset = (id: AdvancedChartId, offset: -1 | 1) => {
    if (!onReorderCharts) return;
    const fromIndex = order.indexOf(id);
    const toIndex = fromIndex + offset;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= order.length) return;
    const updated = moveArrayItem(order, fromIndex, toIndex);
    onReorderCharts(updated);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveChartDrag(String(event.active.id) as AdvancedChartId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id) as AdvancedChartId;
    setActiveChartDrag(null);
    if (!event.over || !onReorderCharts) return;

    const overId = String(event.over.id) as AdvancedChartId;
    if (activeId === overId) return;

    const fromIndex = order.indexOf(activeId);
    const toIndex = order.indexOf(overId);
    if (fromIndex < 0 || toIndex < 0) return;

    const updated = moveArrayItem(order, fromIndex, toIndex);
    onReorderCharts(updated);
    toast.success(`Ordem dos gráficos avançados atualizada.`);
  };

  const renderChartById = (id: AdvancedChartId) => {
    switch (id) {
      case "global-income-expense":
        return <GlobalIncomeExpenseChart initialData={incomeVsExpenseData.global} competencyMonth={selectedMonth} />;
      case "account-income-expense":
        return (
          <AccountIncomeExpenseChart initialData={incomeVsExpenseData.byAccount} competencyMonth={selectedMonth} />
        );
      case "purchasing-power":
        return <PurchasingPowerChart initialData={incomeVsExpenseData.byAccount} competencyMonth={selectedMonth} />;
      case "account-vs-global":
        return (
          <AccountVsGlobalExpenseChart
            initialData={incomeVsExpenseData.accountVsGlobal}
            competencyMonth={selectedMonth}
          />
        );
    }
  };

  return (
    <div className="bg-card rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 shadow-sm p-5 sm:p-6 space-y-4 w-full min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <LineChart className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">Análises Avançadas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparativos por conta, poder de compra e despesa global
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleToggle}
          className="rounded-full text-xs font-semibold px-4 border-white/10 hover:bg-white/5 cursor-pointer shrink-0"
        >
          {isOpen ? (
            <>
              Recolher
              <ChevronUp className="w-3.5 h-3.5 ml-1.5" />
            </>
          ) : (
            <>
              Ver gráficos
              <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="pt-4 border-t border-white/5 animate-in fade-in-50 duration-300">
          <DndContext
            sensors={sensors}
            collisionDetection={advancedCollisionStrategy}
            onDragStart={handleDragStart}
            onDragCancel={() => setActiveChartDrag(null)}
            onDragEnd={handleDragEnd}
          >
            <div className="grid gap-6 lg:grid-cols-2">
              {order.map((chartId, idx) => (
                <SortableAdvancedChartItem
                  key={chartId}
                  id={chartId}
                  index={idx}
                  total={order.length}
                  isEditMode={isEditMode}
                  isDraggingAny={activeChartDrag !== null}
                  onMoveByOffset={handleMoveByOffset}
                >
                  {renderChartById(chartId)}
                </SortableAdvancedChartItem>
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeChartDrag ? (
                <div className="rounded-2xl border border-primary/50 bg-card/95 backdrop-blur-md p-4 shadow-2xl min-w-[220px] max-w-[300px] pointer-events-none">
                  <div className="flex items-center gap-2">
                    <GripHorizontal className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-bold text-sm text-foreground truncate">
                      {ADVANCED_CHARTS_META[activeChartDrag].title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ADVANCED_CHARTS_META[activeChartDrag].description}
                  </p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  );
}
