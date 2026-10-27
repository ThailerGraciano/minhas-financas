"use client";

import { CategoryIcon } from "@/components/category-icon";
import { Progress } from "@/components/ui/progress";
import {
  validateAllocationToIncome,
  type BudgetIncomeSource,
  type BudgetPlanItem,
  type BudgetPlannerSummary,
  type IncomeAllocationSummary,
} from "@/lib/budget-planner-utils";
import {
  computeIncomeContainersLayout,
  computeInnerIncomeTiles,
  computeUnallocatedTrayLayout,
  type InnerIncomeTile,
} from "@/lib/budget-treemap-layout";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  AlertTriangle,
  ArrowDownToLine,
  Ban,
  CheckCircle2,
  FolderOpen,
  GripVertical,
  Info,
  Layers,
  Sparkles,
  Wallet,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useMeasure } from "react-use";
import { toast } from "sonner";

interface PaletteItem {
  bg: string;
  border: string;
  text: string;
  badge: string;
}

// Mesma paleta harmônica utilizada no ExpenseTreemap do Dashboard
const COLOR_PALETTES: PaletteItem[] = [
  {
    bg: "bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-blue-950/20",
    border: "border-blue-500/30 hover:border-blue-400/60",
    text: "text-blue-300",
    badge: "bg-blue-500/20 text-blue-200 border-blue-500/35",
  },
  {
    bg: "bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-emerald-950/20",
    border: "border-emerald-500/30 hover:border-emerald-400/60",
    text: "text-emerald-300",
    badge: "bg-emerald-500/20 text-emerald-200 border-emerald-500/35",
  },
  {
    bg: "bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-amber-950/20",
    border: "border-amber-500/30 hover:border-amber-400/60",
    text: "text-amber-300",
    badge: "bg-amber-500/20 text-amber-200 border-amber-500/35",
  },
  {
    bg: "bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-purple-950/20",
    border: "border-purple-500/30 hover:border-purple-400/60",
    text: "text-purple-300",
    badge: "bg-purple-500/20 text-purple-200 border-purple-500/35",
  },
  {
    bg: "bg-gradient-to-br from-rose-500/20 via-rose-500/10 to-rose-950/20",
    border: "border-rose-500/30 hover:border-rose-400/60",
    text: "text-rose-300",
    badge: "bg-rose-500/20 text-rose-200 border-rose-500/35",
  },
  {
    bg: "bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-orange-950/20",
    border: "border-orange-500/30 hover:border-orange-400/60",
    text: "text-orange-300",
    badge: "bg-orange-500/20 text-orange-200 border-orange-500/35",
  },
  {
    bg: "bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-cyan-950/20",
    border: "border-cyan-500/30 hover:border-cyan-400/60",
    text: "text-cyan-300",
    badge: "bg-cyan-500/20 text-cyan-200 border-cyan-500/35",
  },
  {
    bg: "bg-gradient-to-br from-indigo-500/20 via-indigo-500/10 to-indigo-950/20",
    border: "border-indigo-500/30 hover:border-indigo-400/60",
    text: "text-indigo-300",
    badge: "bg-indigo-500/20 text-indigo-200 border-indigo-500/35",
  },
];

export function getCategoryPalette(categoryName: string): PaletteItem {
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLOR_PALETTES[Math.abs(hash) % COLOR_PALETTES.length];
}

const formatBRL = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

interface DraggableExpenseTileProps {
  item: BudgetPlanItem;
  styleRect: { left: number; top: number; width: number; height: number };
  percentLabel: string;
  contextLabel: string;
  onSelectItem: (item: BudgetPlanItem) => void;
}

function DraggableExpenseTile({
  item,
  styleRect,
  percentLabel,
  contextLabel,
  onSelectItem,
}: DraggableExpenseTileProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.itemKey,
    data: { item },
  });

  const palette = getCategoryPalette(item.categoryName);
  const { width, height } = styleRect;

  if (width < 6 || height < 6) return null;

  const isBig = width >= 115 && height >= 64;
  const isMedium = width >= 66 && height >= 38;
  const isSmall = width >= 38 && height >= 24;

  const fullTitle = item.subcategoryName
    ? `${item.categoryName} › ${item.subcategoryName}: ${formatBRL(item.amount)} (${percentLabel} ${contextLabel}) — Clique para detalhes ou arraste`
    : `${item.categoryName}: ${formatBRL(item.amount)} (${percentLabel} ${contextLabel}) — Clique para detalhes ou arraste`;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelectItem(item);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          onSelectItem(item);
        }
      }}
      title={fullTitle}
      style={{
        left: styleRect.left,
        top: styleRect.top,
        width: styleRect.width,
        height: styleRect.height,
      }}
      className={cn(
        "absolute rounded-xl border overflow-hidden flex flex-col justify-between select-none shadow-sm transition-all duration-200 cursor-grab active:cursor-grabbing group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isBig ? "p-2 sm:p-2.5" : isMedium ? "p-1.5" : "p-1",
        palette.bg,
        palette.border,
        isDragging ? "opacity-30 scale-95 z-0" : "hover:z-10 hover:shadow-md hover:brightness-110",
      )}
    >
      {isBig ? (
        <>
          <div className="flex items-start justify-between gap-1 w-full min-w-0">
            <div className="flex items-start gap-1.5 min-w-0 flex-1">
              {width >= 135 && (
                <CategoryIcon
                  name={item.categoryIcon || item.categoryName}
                  className={cn("w-3.5 h-3.5 shrink-0 mt-0.5 opacity-85", palette.text)}
                />
              )}
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "font-bold text-xs leading-tight block",
                    height >= 85 ? "line-clamp-2" : "truncate",
                    palette.text,
                  )}
                >
                  {item.label}
                </span>
                {item.subcategoryName && height >= 78 && (
                  <span className="text-[10px] text-muted-foreground/80 block truncate">
                    {item.categoryName}
                  </span>
                )}
              </div>
            </div>
            <GripVertical className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70 shrink-0 transition-colors" />
          </div>

          <div className="flex items-end justify-between gap-1 mt-auto pt-1 w-full">
            <span className="font-black text-xs sm:text-sm tracking-tight text-foreground tabular-nums truncate">
              {formatBRL(item.amount)}
            </span>
            <span
              className={cn(
                "font-bold text-[10px] px-1.5 py-0.5 rounded-md border shrink-0 leading-none tabular-nums",
                palette.badge,
              )}
            >
              {percentLabel}
            </span>
          </div>
        </>
      ) : isMedium ? (
        <div className="flex flex-col justify-between h-full w-full">
          <div className="flex items-start justify-between gap-0.5 min-w-0">
            <span className={cn("font-bold text-[11px] leading-tight truncate", palette.text)}>
              {item.label}
            </span>
          </div>
          <div className="flex items-end justify-between gap-1 mt-auto w-full">
            <span className="font-bold text-[10px] text-foreground tracking-tight tabular-nums truncate">
              {formatBRL(item.amount)}
            </span>
            {width >= 95 && (
              <span
                className={cn(
                  "font-bold text-[9px] px-1 py-0.5 rounded border shrink-0 leading-none tabular-nums",
                  palette.badge,
                )}
              >
                {percentLabel}
              </span>
            )}
          </div>
        </div>
      ) : isSmall ? (
        <div className="flex flex-col justify-between h-full w-full">
          <span className={cn("font-semibold text-[9px] leading-tight truncate w-full", palette.text)}>
            {item.label}
          </span>
          <span className="text-[8px] font-bold text-foreground/90 tabular-nums truncate mt-auto">
            {width >= 54 ? formatBRL(item.amount) : percentLabel}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full w-full">
          <span className={cn("w-1.5 h-1.5 rounded-full", palette.text)} />
        </div>
      )}
    </div>
  );
}

interface DroppableIncomeContainerProps {
  summary: IncomeAllocationSummary;
  layoutStyle?: { left: number; top: number; width: number; height: number };
  tiles: InnerIncomeTile[];
  activeDragItem: BudgetPlanItem | null;
  selectedIncomes: BudgetIncomeSource[];
  allItems: BudgetPlanItem[];
  onSelectItem: (item: BudgetPlanItem) => void;
  isStackedMobile?: boolean;
}

function DroppableIncomeContainer({
  summary,
  layoutStyle,
  tiles,
  activeDragItem,
  selectedIncomes,
  allItems,
  onSelectItem,
  isStackedMobile = false,
}: DroppableIncomeContainerProps) {
  const droppableId = `income:${summary.income.id}`;
  const { isOver, setNodeRef } = useDroppable({
    id: droppableId,
    data: { type: "income", incomeId: summary.income.id },
  });

  const dragValidation = useMemo(() => {
    if (!activeDragItem) return null;
    if (activeDragItem.incomeSourceId === summary.income.id) {
      return { valid: true, isSameSource: true, remainingCapacity: summary.remainingCapacity, shortfall: 0 };
    }
    const res = validateAllocationToIncome(
      activeDragItem.itemKey,
      activeDragItem.amount,
      summary.income.id,
      selectedIncomes,
      allItems,
    );
    return { ...res, isSameSource: false };
  }, [activeDragItem, summary.income.id, summary.remainingCapacity, selectedIncomes, allItems]);

  const isInvalidTarget = Boolean(activeDragItem && dragValidation && !dragValidation.valid);
  const isValidNewTarget = Boolean(
    activeDragItem && dragValidation && dragValidation.valid && !dragValidation.isSameSource,
  );

  const isCompactHeader = !isStackedMobile && layoutStyle && layoutStyle.height < 180;
  const headerHeight = isCompactHeader ? 64 : 74;

  return (
    <div
      ref={setNodeRef}
      style={
        isStackedMobile
          ? undefined
          : layoutStyle
            ? {
                left: layoutStyle.left,
                top: layoutStyle.top,
                width: layoutStyle.width,
                height: layoutStyle.height,
              }
            : undefined
      }
      className={cn(
        "rounded-2xl border bg-[#14141B] flex flex-col overflow-hidden transition-all duration-200",
        isStackedMobile ? "relative w-full" : "absolute",
        isOver && isValidNewTarget
          ? "border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-950/20 shadow-lg z-20"
          : isOver && isInvalidTarget
            ? "border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/25 shadow-lg z-20"
            : isValidNewTarget
              ? "border-emerald-500/35 hover:border-emerald-500/50"
              : isInvalidTarget
                ? "border-rose-500/25 opacity-75"
                : "border-white/10 hover:border-white/20",
      )}
    >
      {/* Cabeçalho do Contêiner da Receita (Seção 4.2.A) */}
      <div
        style={isStackedMobile ? undefined : { height: headerHeight }}
        className="px-3 py-2 bg-[#1C1C26] border-b border-white/5 flex flex-col justify-between shrink-0"
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span
              className="font-bold text-xs sm:text-sm text-foreground truncate"
              title={summary.income.name}
            >
              {summary.income.name}
            </span>
          </div>
          <span className="font-black text-xs sm:text-sm text-emerald-400 tabular-nums shrink-0">
            {formatBRL(summary.income.amount)}
          </span>
        </div>

        {/* Barra de comprometimento da receita */}
        <div className="space-y-1">
          <Progress
            value={Math.min(100, Math.max(0, summary.committedPercent))}
            className={cn(
              "h-1 bg-white/10",
              summary.committedPercent >= 100
                ? "[&>div]:bg-amber-500"
                : "[&>div]:bg-emerald-500",
            )}
          />
          <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground tabular-nums">
            <span className="truncate">
              Vinculado:{" "}
              <strong className="text-foreground">{formatBRL(summary.allocatedAmount)}</strong> (
              {summary.committedPercent.toFixed(0)}%)
            </span>
            <span className="shrink-0">
              Disponível:{" "}
              <strong
                className={
                  summary.remainingCapacity > 0.005 ? "text-emerald-400" : "text-muted-foreground"
                }
              >
                {formatBRL(summary.remainingCapacity)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Feedback de destino durante o arraste (Seção 5.5 e 5.6) */}
      {activeDragItem && isOver && (
        <div
          className={cn(
            "px-2.5 py-1 text-[11px] font-bold flex items-center justify-center gap-1.5 z-30 shrink-0",
            isInvalidTarget
              ? "bg-rose-500/90 text-white"
              : isValidNewTarget
                ? "bg-emerald-500/90 text-black"
                : "bg-white/10 text-foreground",
          )}
        >
          {isInvalidTarget ? (
            <>
              <Ban className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Capacidade insuficiente (faltam {formatBRL(dragValidation?.shortfall || 0)})
              </span>
            </>
          ) : isValidNewTarget ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Soltar para vincular • Restará{" "}
                {formatBRL(
                  Math.max(0, (dragValidation?.remainingCapacity || 0) - activeDragItem.amount),
                )}
              </span>
            </>
          ) : (
            <span>Já vinculada a esta receita</span>
          )}
        </div>
      )}

      {/* Área Interna Proporcional do Treemap da Receita (Seção 4.2.B & Seção 7) */}
      <div
        className={cn(
          "relative flex-1 m-2 rounded-xl overflow-hidden",
          isStackedMobile ? "min-h-[190px]" : "",
        )}
      >
        {tiles.map((tile) => {
          if (tile.type === "free_capacity") {
            if (tile.width < 12 || tile.height < 12) return null;
            const showFreeDetails = tile.width >= 95 && tile.height >= 44;

            return (
              <div
                key={`free-${summary.income.id}`}
                style={{
                  left: tile.x0,
                  top: tile.y0,
                  width: tile.width,
                  height: tile.height,
                }}
                title={`Capacidade livre em ${summary.income.name}: ${formatBRL(tile.remainingCapacity)} (${tile.percentOfIncome.toFixed(0)}% da receita)`}
                className={cn(
                  "absolute rounded-xl border border-dashed flex flex-col items-center justify-center text-center p-2 transition-colors select-none",
                  isOver && isValidNewTarget
                    ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-300"
                    : isOver && isInvalidTarget
                      ? "border-rose-500/60 bg-rose-500/10 text-rose-300"
                      : "border-white/10 bg-white/[0.02] text-muted-foreground/60",
                )}
              >
                {showFreeDetails ? (
                  <>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                      Capacidade Livre
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-400/90 tabular-nums mt-0.5">
                      {formatBRL(tile.remainingCapacity)}
                    </span>
                    {tile.height >= 72 && (
                      <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {tile.percentOfIncome.toFixed(0)}% disponível • Arraste despesas aqui
                      </span>
                    )}
                  </>
                ) : tile.width >= 50 && tile.height >= 22 ? (
                  <span className="text-[9px] font-semibold text-emerald-400/75 tabular-nums truncate">
                    +{formatBRL(tile.remainingCapacity)}
                  </span>
                ) : null}
              </div>
            );
          }

          return (
            <DraggableExpenseTile
              key={tile.item.itemKey}
              item={tile.item}
              styleRect={{
                left: tile.x0,
                top: tile.y0,
                width: tile.width,
                height: tile.height,
              }}
              percentLabel={`${Math.round(tile.percentOfIncome)}%`}
              contextLabel={`de ${summary.income.name}`}
              onSelectItem={onSelectItem}
            />
          );
        })}
      </div>
    </div>
  );
}

interface MobileIncomeContainerWrapperProps {
  summary: IncomeAllocationSummary;
  activeDragItem: BudgetPlanItem | null;
  selectedIncomes: BudgetIncomeSource[];
  allItems: BudgetPlanItem[];
  onSelectItem: (item: BudgetPlanItem) => void;
}

function MobileIncomeContainerWrapper({
  summary,
  activeDragItem,
  selectedIncomes,
  allItems,
  onSelectItem,
}: MobileIncomeContainerWrapperProps) {
  const [ref, { width }] = useMeasure<HTMLDivElement>();
  const innerWidth = Math.max(0, width - 16);
  const innerHeight = 200;

  const tiles = useMemo(
    () => computeInnerIncomeTiles(summary, innerWidth, innerHeight),
    [summary, innerWidth, innerHeight],
  );

  return (
    <div ref={ref} className="w-full">
      <DroppableIncomeContainer
        summary={summary}
        tiles={tiles}
        activeDragItem={activeDragItem}
        selectedIncomes={selectedIncomes}
        allItems={allItems}
        onSelectItem={onSelectItem}
        isStackedMobile
      />
    </div>
  );
}

interface UnallocatedExpensesTrayProps {
  items: BudgetPlanItem[];
  totalUndistributed: number;
  activeDragItem: BudgetPlanItem | null;
  onSelectItem: (item: BudgetPlanItem) => void;
}

function UnallocatedExpensesTray({
  items,
  totalUndistributed,
  activeDragItem,
  onSelectItem,
}: UnallocatedExpensesTrayProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: "tray:unallocated",
    data: { type: "tray" },
  });

  const [measureRef, { width }] = useMeasure<HTMLDivElement>();

  // Altura dinâmica proporcional à quantidade de itens, com rolagem própria quando necessário
  const canvasHeight = useMemo(() => {
    if (items.length === 0) return 120;
    if (items.length <= 4) return 170;
    if (items.length <= 8) return 230;
    if (items.length <= 14) return 300;
    return Math.min(520, Math.ceil(items.length / 4) * 85);
  }, [items.length]);

  const unallocatedTiles = useMemo(
    () => computeUnallocatedTrayLayout(items, Math.max(0, width), canvasHeight),
    [items, width, canvasHeight],
  );

  const isReturningAllocatedItem = Boolean(activeDragItem && activeDragItem.incomeSourceId !== null);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-2xl sm:rounded-3xl p-4 sm:p-5 border transition-all duration-200 space-y-3",
        isOver && isReturningAllocatedItem
          ? "bg-amber-500/10 border-amber-400 ring-2 ring-amber-500/30 shadow-lg"
          : "bg-[#16161E] border-white/10",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-bold text-foreground">
                Categorias sem receita vinculada
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10">
                {items.length} {items.length === 1 ? "item" : "itens"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Arraste os blocos abaixo para dentro de uma receita acima, ou clique em um bloco para
              vincular/editar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {isOver && isReturningAllocatedItem && (
            <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/30 flex items-center gap-1">
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Soltar para desvincular da receita
            </span>
          )}
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20 tabular-nums">
            Sem vínculo: {formatBRL(totalUndistributed)}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="h-[110px] rounded-2xl border border-dashed border-emerald-500/25 bg-emerald-500/5 flex flex-col items-center justify-center text-center p-4 gap-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Todas as despesas orçadas estão vinculadas a receitas!</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Arraste qualquer bloco de uma receita de volta para esta bandeja se quiser remover o
            vínculo.
          </p>
        </div>
      ) : (
        <div className="max-h-[380px] overflow-y-auto pr-1">
          <div
            ref={measureRef}
            style={{ height: canvasHeight }}
            className="relative w-full rounded-xl bg-black/25 border border-white/5 overflow-hidden"
          >
            {unallocatedTiles.map((tile) => (
              <DraggableExpenseTile
                key={tile.item.itemKey}
                item={tile.item}
                styleRect={{
                  left: tile.x0,
                  top: tile.y0,
                  width: tile.width,
                  height: tile.height,
                }}
                percentLabel={`${Math.round(tile.percentOfUnallocated)}%`}
                contextLabel="do total sem vínculo"
                onSelectItem={onSelectItem}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface BudgetVisualPlannerProps {
  summary: BudgetPlannerSummary;
  selectedIncomes: BudgetIncomeSource[];
  allItems: BudgetPlanItem[];
  onAllocateItem: (itemKey: string, targetIncomeId: string | null) => void;
  onSelectItem: (item: BudgetPlanItem) => void;
  onAutoDistribute?: () => void;
}

export function BudgetVisualPlanner({
  summary,
  selectedIncomes,
  allItems,
  onAllocateItem,
  onSelectItem,
  onAutoDistribute,
}: BudgetVisualPlannerProps) {
  const [mapRef, { width: mapWidth }] = useMeasure<HTMLDivElement>();
  const [activeDragKey, setActiveDragKey] = useState<string | null>(null);

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
    useSensor(KeyboardSensor),
  );

  const activeDragItem = useMemo(
    () => (activeDragKey ? allItems.find((i) => i.itemKey === activeDragKey) ?? null : null),
    [activeDragKey, allItems],
  );

  const mapHeight = useMemo(() => {
    if (summary.incomeSummaries.length <= 1) return 380;
    if (summary.incomeSummaries.length <= 3) return 440;
    return 520;
  }, [summary.incomeSummaries.length]);

  const incomeLayouts = useMemo(
    () =>
      computeIncomeContainersLayout(
        summary.incomeSummaries,
        Math.max(0, mapWidth),
        mapHeight,
      ),
    [summary.incomeSummaries, mapWidth, mapHeight],
  );

  const isCompactViewport = mapWidth > 0 && mapWidth < 640;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragKey(String(event.active.id));
  };

  const handleDragCancel = () => {
    setActiveDragKey(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const draggedKey = String(event.active.id);
    setActiveDragKey(null);

    if (!event.over) return;
    const overId = String(event.over.id);
    const draggedItem = allItems.find((i) => i.itemKey === draggedKey);
    if (!draggedItem) return;

    if (overId === "tray:unallocated") {
      if (draggedItem.incomeSourceId !== null) {
        onAllocateItem(draggedItem.itemKey, null);
        toast.info(`"${draggedItem.label}" devolvido para Categorias sem receita vinculada.`);
      }
      return;
    }

    if (overId.startsWith("income:")) {
      const targetIncomeId = overId.replace("income:", "");
      if (draggedItem.incomeSourceId === targetIncomeId) return;

      const validation = validateAllocationToIncome(
        draggedItem.itemKey,
        draggedItem.amount,
        targetIncomeId,
        selectedIncomes,
        allItems,
      );

      if (!validation.valid) {
        toast.error(
          validation.reason ||
            "Esta despesa ultrapassa a capacidade restante da receita selecionada.",
        );
        return;
      }

      onAllocateItem(draggedItem.itemKey, targetIncomeId);
      const targetIncome = selectedIncomes.find((inc) => inc.id === targetIncomeId);
      if (targetIncome) {
        toast.success(`"${draggedItem.label}" vinculado a "${targetIncome.name}".`);
      }
    }
  };

  return (
    <div className="bg-[#1A1A22] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/5 shadow-sm space-y-5">
      {/* Cabeçalho do Planejador Visual */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Planejador Visual de Orçamento
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Treemap & Drag and Drop
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Arraste os blocos de despesas para dentro das receitas fixas ou clique em qualquer
              bloco para editar valores e vínculos
            </p>
          </div>
        </div>

        {onAutoDistribute &&
          summary.unallocatedItems.length > 0 &&
          selectedIncomes.length > 0 && (
            <button
              type="button"
              onClick={onAutoDistribute}
              className="self-start md:self-center text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/25 rounded-xl px-3 py-2 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Encaixar automaticamente as categorias sem vínculo nas receitas com saldo disponível"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sugerir Alocação Automática</span>
            </button>
          )}
      </div>

      {/* Alerta caso as despesas orçadas superem as receitas selecionadas (Seção 6.2) */}
      {summary.hasOverBudgetWarning && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/25 p-3.5 flex items-start gap-3 text-xs text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-rose-300">
              As despesas orçadas ({formatBRL(summary.totalBudgetedExpenses)}) superam as receitas
              selecionadas ({formatBRL(summary.selectedIncomeTotal)}) em{" "}
              {formatBRL(Math.abs(summary.projectedBalance))}.
            </p>
            <p className="text-rose-200/80">
              As categorias que excedem a capacidade das receitas permanecem preservadas na bandeja
              &quot;Categorias sem receita vinculada&quot; e continuam contabilizadas no Saldo
              Previsto.
            </p>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-5">
          {/* A. Mapa de Blocos das Receitas Selecionadas */}
          {selectedIncomes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center flex flex-col items-center justify-center gap-2">
              <Wallet className="w-8 h-8 text-muted-foreground/60" />
              <h4 className="font-bold text-sm sm:text-base text-foreground">
                Nenhuma receita selecionada para distribuição
              </h4>
              <p className="text-xs text-muted-foreground max-w-md">
                Selecione ao menos uma receita na seção &quot;Receitas do Mês Selecionadas&quot;
                acima para habilitar os contêineres de distribuição proporcional.
              </p>
            </div>
          ) : allItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center flex flex-col items-center justify-center gap-2">
              <Info className="w-8 h-8 text-muted-foreground/60" />
              <h4 className="font-bold text-sm sm:text-base text-foreground">
                Nenhuma categoria orçada neste período
              </h4>
              <p className="text-xs text-muted-foreground max-w-md">
                Clique em &quot;Novo Orçamento&quot; no topo da página para definir limites de
                gastos e distribuí-los entre suas receitas.
              </p>
            </div>
          ) : (
            <div ref={mapRef} className="w-full">
              {isCompactViewport ? (
                <div className="space-y-3">
                  {summary.incomeSummaries.map((incSummary) => (
                    <MobileIncomeContainerWrapper
                      key={incSummary.income.id}
                      summary={incSummary}
                      activeDragItem={activeDragItem}
                      selectedIncomes={selectedIncomes}
                      allItems={allItems}
                      onSelectItem={onSelectItem}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{ height: mapHeight }}
                  className="relative w-full rounded-2xl bg-black/20 border border-white/5 overflow-hidden"
                >
                  {incomeLayouts.map((container) => (
                    <DroppableIncomeContainer
                      key={container.summary.income.id}
                      summary={container.summary}
                      layoutStyle={{
                        left: container.x0,
                        top: container.y0,
                        width: container.width,
                        height: container.height,
                      }}
                      tiles={container.tiles}
                      activeDragItem={activeDragItem}
                      selectedIncomes={selectedIncomes}
                      allItems={allItems}
                      onSelectItem={onSelectItem}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* C. Bandeja Externa Permanente: Categorias sem receita vinculada */}
          <UnallocatedExpensesTray
            items={summary.unallocatedItems}
            totalUndistributed={summary.totalUndistributed}
            activeDragItem={activeDragItem}
            onSelectItem={onSelectItem}
          />
        </div>

        {/* Overlay flutuante durante o arraste */}
        <DragOverlay dropAnimation={null}>
          {activeDragItem ? (
            <div
              className={cn(
                "rounded-xl border p-3 shadow-2xl backdrop-blur-md min-w-[160px] max-w-[220px] pointer-events-none",
                getCategoryPalette(activeDragItem.categoryName).bg,
                getCategoryPalette(activeDragItem.categoryName).border,
              )}
            >
              <div className="flex items-center gap-2">
                <CategoryIcon
                  name={activeDragItem.categoryIcon || activeDragItem.categoryName}
                  className={cn(
                    "w-4 h-4 shrink-0",
                    getCategoryPalette(activeDragItem.categoryName).text,
                  )}
                />
                <span className="font-bold text-xs text-foreground truncate">
                  {activeDragItem.label}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="font-black text-foreground tabular-nums">
                  {formatBRL(activeDragItem.amount)}
                </span>
                <span className="text-[10px] text-muted-foreground">Arrastando...</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

