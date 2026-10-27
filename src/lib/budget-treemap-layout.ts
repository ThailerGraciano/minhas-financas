import type { BudgetPlanItem, IncomeAllocationSummary } from "@/lib/budget-planner-utils";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";

export interface TreemapRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
  height: number;
}

export interface ExpenseTileLayout extends TreemapRect {
  type: "expense";
  item: BudgetPlanItem;
  percentOfIncome: number;
}

export interface FreeCapacityTileLayout extends TreemapRect {
  type: "free_capacity";
  remainingCapacity: number;
  percentOfIncome: number;
}

export type InnerIncomeTile = ExpenseTileLayout | FreeCapacityTileLayout;

export interface IncomeContainerLayout extends TreemapRect {
  summary: IncomeAllocationSummary;
  percentOfTotalIncome: number;
  innerCanvasWidth: number;
  innerCanvasHeight: number;
  tiles: InnerIncomeTile[];
}

export interface UnallocatedTileLayout extends TreemapRect {
  item: BudgetPlanItem;
  percentOfUnallocated: number;
}

interface InternalTreeNode {
  id: string;
  value?: number;
  isFreeCapacity?: boolean;
  item?: BudgetPlanItem;
  summary?: IncomeAllocationSummary;
  children?: InternalTreeNode[];
}

const HEADER_HEIGHT_COMPACT = 64;
const HEADER_HEIGHT_FULL = 74;
const CONTAINER_PADDING = 8;

/**
 * Calcula as dimensões proporcionais de um conjunto de blocos de despesas
 * mais a capacidade livre restante dentro de uma receita, utilizando d3-hierarchy treemap.
 */
export function computeInnerIncomeTiles(
  summary: IncomeAllocationSummary,
  canvasWidth: number,
  canvasHeight: number,
): InnerIncomeTile[] {
  if (canvasWidth < 20 || canvasHeight < 20 || summary.income.amount <= 0) {
    return [];
  }

  const children: InternalTreeNode[] = summary.allocatedItems.map((item) => ({
    id: item.itemKey,
    value: Math.max(0.01, item.amount),
    isFreeCapacity: false,
    item,
  }));

  if (summary.remainingCapacity > 0.01) {
    children.push({
      id: `__free_${summary.income.id}`,
      value: summary.remainingCapacity,
      isFreeCapacity: true,
    });
  }

  if (children.length === 0) return [];

  const rootData: InternalTreeNode = {
    id: `root_${summary.income.id}`,
    children,
  };

  const h = hierarchy<InternalTreeNode>(rootData)
    .sum((d) => d.value || 0)
    .sort((a, b) => {
      // Mantém a área livre sempre ao final para evitar embaralhamento dos blocos alocados
      if (a.data.isFreeCapacity && !b.data.isFreeCapacity) return 1;
      if (!a.data.isFreeCapacity && b.data.isFreeCapacity) return -1;
      const diff = (b.value || 0) - (a.value || 0);
      if (Math.abs(diff) > 0.01) return diff;
      return a.data.id.localeCompare(b.data.id);
    });

  const tree = treemap<InternalTreeNode>()
    .tile(treemapSquarify)
    .size([canvasWidth, canvasHeight])
    .paddingInner(4)
    .paddingOuter(2)
    .round(true);

  const laidOut = tree(h);
  const incomeTotal = Math.max(summary.income.amount, 0.01);

  return (laidOut.children || []).map((node): InnerIncomeTile => {
    const width = Math.max(0, node.x1 - node.x0);
    const height = Math.max(0, node.y1 - node.y0);

    if (node.data.isFreeCapacity) {
      return {
        type: "free_capacity",
        x0: node.x0,
        y0: node.y0,
        x1: node.x1,
        y1: node.y1,
        width,
        height,
        remainingCapacity: summary.remainingCapacity,
        percentOfIncome: (summary.remainingCapacity / incomeTotal) * 100,
      };
    }

    const item = node.data.item!;
    return {
      type: "expense",
      x0: node.x0,
      y0: node.y0,
      x1: node.x1,
      y1: node.y1,
      width,
      height,
      item,
      percentOfIncome: (item.amount / incomeTotal) * 100,
    };
  });
}

/**
 * Calcula o layout proporcional de contêineres de receitas e seus blocos internos.
 */
export function computeIncomeContainersLayout(
  incomeSummaries: IncomeAllocationSummary[],
  containerWidth: number,
  containerHeight: number,
): IncomeContainerLayout[] {
  if (containerWidth < 50 || containerHeight < 50 || incomeSummaries.length === 0) {
    return [];
  }

  const totalIncome = incomeSummaries.reduce((acc, s) => acc + Math.max(0.01, s.income.amount), 0);

  const rootData: InternalTreeNode = {
    id: "incomes_root",
    children: incomeSummaries.map((s) => ({
      id: s.income.id,
      value: Math.max(0.01, s.income.amount),
      summary: s,
    })),
  };

  const h = hierarchy<InternalTreeNode>(rootData)
    .sum((d) => d.value || 0)
    .sort((a, b) => {
      const diff = (b.value || 0) - (a.value || 0);
      if (Math.abs(diff) > 0.01) return diff;
      return a.data.id.localeCompare(b.data.id);
    });

  const tree = treemap<InternalTreeNode>()
    .tile(treemapSquarify)
    .size([containerWidth, containerHeight])
    .paddingInner(10)
    .paddingOuter(2)
    .round(true);

  const laidOut = tree(h);

  return (laidOut.children || []).map((node) => {
    const summary = node.data.summary!;
    const width = Math.max(0, node.x1 - node.x0);
    const height = Math.max(0, node.y1 - node.y0);
    const headerHeight = height < 180 ? HEADER_HEIGHT_COMPACT : HEADER_HEIGHT_FULL;

    const innerCanvasWidth = Math.max(0, width - CONTAINER_PADDING * 2);
    const innerCanvasHeight = Math.max(0, height - headerHeight - CONTAINER_PADDING);

    const tiles = computeInnerIncomeTiles(summary, innerCanvasWidth, innerCanvasHeight);

    return {
      x0: node.x0,
      y0: node.y0,
      x1: node.x1,
      y1: node.y1,
      width,
      height,
      summary,
      percentOfTotalIncome: totalIncome > 0 ? (summary.income.amount / totalIncome) * 100 : 0,
      innerCanvasWidth,
      innerCanvasHeight,
      tiles,
    };
  });
}

/**
 * Calcula o layout proporcional em treemap para a bandeja externa de
 * "Categorias sem receita vinculada".
 */
export function computeUnallocatedTrayLayout(
  items: BudgetPlanItem[],
  width: number,
  height: number,
): UnallocatedTileLayout[] {
  if (width < 40 || height < 40 || items.length === 0) {
    return [];
  }

  const totalUnallocated = items.reduce((acc, item) => acc + Math.max(0.01, item.amount), 0);

  const rootData: InternalTreeNode = {
    id: "unallocated_root",
    children: items.map((item) => ({
      id: item.itemKey,
      value: Math.max(0.01, item.amount),
      item,
    })),
  };

  const h = hierarchy<InternalTreeNode>(rootData)
    .sum((d) => d.value || 0)
    .sort((a, b) => {
      const diff = (b.value || 0) - (a.value || 0);
      if (Math.abs(diff) > 0.01) return diff;
      return a.data.id.localeCompare(b.data.id);
    });

  const tree = treemap<InternalTreeNode>()
    .tile(treemapSquarify)
    .size([width, height])
    .paddingInner(6)
    .paddingOuter(2)
    .round(true);

  const laidOut = tree(h);

  return (laidOut.children || []).map((node) => {
    const item = node.data.item!;
    const rectWidth = Math.max(0, node.x1 - node.x0);
    const rectHeight = Math.max(0, node.y1 - node.y0);

    return {
      x0: node.x0,
      y0: node.y0,
      x1: node.x1,
      y1: node.y1,
      width: rectWidth,
      height: rectHeight,
      item,
      percentOfUnallocated: totalUnallocated > 0 ? (item.amount / totalUnallocated) * 100 : 0,
    };
  });
}

