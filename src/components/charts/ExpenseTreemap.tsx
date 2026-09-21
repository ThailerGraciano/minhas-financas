"use client";

import { TreemapDataSets, TreemapNode } from "@/app/actions/dashboard";
import { CategoryIcon } from "@/components/category-icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { hierarchy, HierarchyRectangularNode, treemap } from "d3-hierarchy";
import { ChevronRight, ZoomIn } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useMeasure } from "react-use";

interface ExpenseTreemapProps {
  data: TreemapDataSets;
}

interface PaletteItem {
  bg: string;
  border: string;
  text: string;
  badge: string;
}

// Consistent harmonic palettes for categories
const COLOR_PALETTES: PaletteItem[] = [
  {
    bg: "bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent",
    border: "border-blue-500/25 hover:border-blue-500/50",
    text: "text-blue-400",
    badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
  {
    bg: "bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent",
    border: "border-emerald-500/25 hover:border-emerald-500/50",
    text: "text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  {
    bg: "bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent",
    border: "border-amber-500/25 hover:border-amber-500/50",
    text: "text-amber-400",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  {
    bg: "bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent",
    border: "border-purple-500/25 hover:border-purple-500/50",
    text: "text-purple-400",
    badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
  {
    bg: "bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent",
    border: "border-rose-500/25 hover:border-rose-500/50",
    text: "text-rose-400",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
  {
    bg: "bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent",
    border: "border-orange-500/25 hover:border-orange-500/50",
    text: "text-orange-400",
    badge: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  },
  {
    bg: "bg-gradient-to-br from-cyan-500/15 via-cyan-500/5 to-transparent",
    border: "border-cyan-500/25 hover:border-cyan-500/50",
    text: "text-cyan-400",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  {
    bg: "bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent",
    border: "border-indigo-500/25 hover:border-indigo-500/50",
    text: "text-indigo-400",
    badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
];

const stringToColorPalette = (str: string): PaletteItem => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLOR_PALETTES[Math.abs(hash) % COLOR_PALETTES.length];
};

const isTreemapDatasetKey = (key: string): key is keyof TreemapDataSets => {
  return key === "all" || key === "variable" || key === "installment" || key === "fixed";
};

export function ExpenseTreemap({ data }: ExpenseTreemapProps) {
  const [ref, { width, height }] = useMeasure<HTMLDivElement>();

  const [filterType, setFilterType] = useState<keyof TreemapDataSets>("all");
  const [currentRoot, setCurrentRoot] = useState<TreemapNode>(data.all);
  const [path, setPath] = useState<{ name: string; data: TreemapNode }[]>([{ name: "Geral", data: data.all }]);

  const [prevData, setPrevData] = useState(data);
  const [prevFilterType, setPrevFilterType] = useState(filterType);

  if (data !== prevData || filterType !== prevFilterType) {
    const selectedData = data[filterType];
    setCurrentRoot(selectedData);
    setPath([{ name: "Geral", data: selectedData }]);
    setPrevData(data);
    setPrevFilterType(filterType);
  }

  const root = useMemo(() => {
    if (!width || width < 50 || !currentRoot) return null;

    const safeHeight = height && height > 50 ? height : 440;

    const h = hierarchy<TreemapNode>(currentRoot)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // d3 treemap: generates rectangular blocks strictly proportional to node.value
    const tree = treemap<TreemapNode>().size([width, safeHeight]).padding(2).paddingInner(2);

    return tree(h);
  }, [currentRoot, width, height]);

  const handleNodeClick = (node: HierarchyRectangularNode<TreemapNode>) => {
    if (node.data.children && node.data.children.length > 0) {
      setCurrentRoot(node.data);
      setPath([...path, { name: node.data.name, data: node.data }]);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
    setCurrentRoot(newPath[index].data);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const totalValue = root?.value || 0;

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Header controls: Breadcrumbs + Total + Filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Breadcrumb path */}
        <div className="flex items-center space-x-1.5 text-xs sm:text-sm text-muted-foreground overflow-x-auto pb-1 shrink-0">
          {path.map((step, index) => (
            <React.Fragment key={`${step.name}-${index}`}>
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(index)}
                className={cn(
                  "hover:text-foreground transition-colors whitespace-nowrap px-1.5 py-0.5 rounded-md",
                  index === path.length - 1
                    ? "font-semibold text-foreground bg-white/5"
                    : "text-muted-foreground hover:bg-white/5",
                )}
              >
                {step.name}
              </button>
              {index < path.length - 1 && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />}
            </React.Fragment>
          ))}

          {totalValue > 0 && (
            <span className="text-xs text-muted-foreground font-medium pl-2 hidden sm:inline">
              ({formatCurrency(totalValue)})
            </span>
          )}
        </div>

        {/* Filter selector */}
        <div className="w-[150px] sm:w-[170px]">
          <Select
            value={filterType}
            onValueChange={(val) => {
              if (isTreemapDatasetKey(val)) {
                setFilterType(val);
              }
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Filtro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Despesas</SelectItem>
              <SelectItem value="variable">Apenas Variáveis</SelectItem>
              <SelectItem value="installment">Apenas Parceladas</SelectItem>
              <SelectItem value="fixed">Apenas Fixas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Treemap Container: Strictly proportional area layout via d3 */}
      <div
        ref={ref}
        className="relative w-full h-[400px] sm:h-[480px] rounded-2xl overflow-hidden bg-background/50 border border-white/5 p-1"
      >
        {root &&
          root.children &&
          root.children.length > 0 &&
          root.children.map((node, i) => {
            const nodeWidth = Math.max(0, node.x1 - node.x0);
            const nodeHeight = Math.max(0, node.y1 - node.y0);

            // Skip degenerate nodes
            if (nodeWidth < 4 || nodeHeight < 4) return null;

            const hasChildren = Boolean(node.data.children && node.data.children.length > 0);
            const colorName = path.length === 1 ? node.data.name : path[1]?.name || node.data.name;
            const style = stringToColorPalette(colorName);

            const percent = totalValue > 0 && node.value ? Math.round((node.value / totalValue) * 100) : 0;
            const percentText = percent > 0 ? `${percent}%` : null;

            const isBig = nodeWidth >= 100 && nodeHeight >= 60;
            const isMedium = nodeWidth >= 60 && nodeHeight >= 36;
            const isSmall = nodeWidth >= 34 && nodeHeight >= 22;

            return (
              <div
                key={node.data.id || `${node.data.name}-${i}`}
                onClick={() => handleNodeClick(node)}
                title={`${node.data.name}: ${formatCurrency(node.value || 0)}${percentText ? ` (${percentText})` : ""}${hasChildren ? " — Clique para detalhar" : ""}`}
                className={cn(
                  "absolute rounded-xl transition-all duration-200 border overflow-hidden flex flex-col justify-between select-none shadow-sm",
                  isBig ? "p-2 sm:p-2.5" : isMedium ? "p-1.5 sm:p-2" : "p-1",
                  hasChildren ? "cursor-pointer hover:scale-[1.01] hover:z-10 hover:shadow-md" : "cursor-default",
                  style.bg,
                  style.border,
                )}
                style={{
                  left: node.x0,
                  top: node.y0,
                  width: nodeWidth,
                  height: nodeHeight,
                }}
              >
                {/* Large tile content */}
                {isBig ? (
                  <>
                    <div className="flex items-start gap-1.5 w-full min-w-0">
                      {nodeWidth >= 115 && (
                        <CategoryIcon name={node.data.name} className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span
                          className={cn(
                            "font-bold text-xs sm:text-sm leading-snug break-words",
                            nodeHeight >= 70 ? "line-clamp-2" : "truncate",
                            style.text,
                          )}
                        >
                          {node.data.name}
                        </span>
                        {nodeHeight >= 110 && hasChildren && node.data.children && node.data.children.length > 0 && (
                          <span className="text-[10px] text-muted-foreground/70 font-medium mt-0.5 truncate">
                            {node.data.children.length}{" "}
                            {node.data.children.length === 1 ? "subcategoria" : "subcategorias"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-1.5 mt-auto pt-1 w-full">
                      <span className="font-black text-xs sm:text-sm md:text-base tracking-tight text-foreground truncate min-w-0">
                        {formatCurrency(node.value || 0)}
                      </span>
                      <div className="flex items-center gap-1 shrink-0 ml-auto">
                        {hasChildren && <ZoomIn className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />}
                        {percentText && (
                          <span
                            className={cn(
                              "font-bold text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md border shrink-0",
                              style.badge,
                            )}
                          >
                            {percentText}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : isMedium ? (
                  /* Medium tile content */
                  <div className="flex flex-col justify-between h-full w-full">
                    <div className="w-full min-w-0">
                      <span
                        className={cn(
                          "font-bold text-[11px] sm:text-xs leading-tight break-words block",
                          nodeHeight >= 50 ? "line-clamp-2" : "truncate",
                          style.text,
                        )}
                      >
                        {node.data.name}
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-1 mt-auto w-full pt-0.5">
                      <span className="font-bold text-[10px] sm:text-[11px] text-foreground tracking-tight truncate min-w-0">
                        {formatCurrency(node.value || 0)}
                      </span>
                      <div className="flex items-center gap-1 shrink-0 ml-auto">
                        {hasChildren && <ZoomIn className="w-3 h-3 text-muted-foreground/60 shrink-0" />}
                        {percentText && (
                          <span
                            className={cn(
                              "font-bold text-[9px] sm:text-[10px] px-1 py-0.5 rounded border shrink-0 leading-none",
                              style.badge,
                            )}
                          >
                            {percentText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : isSmall ? (
                  /* Small tile content */
                  <div className="flex flex-col justify-between h-full w-full">
                    <span
                      className={cn("font-medium text-[9px] sm:text-[10px] leading-tight truncate w-full", style.text)}
                    >
                      {node.data.name}
                    </span>
                    <div className="flex items-end justify-between gap-0.5 mt-auto w-full">
                      {nodeWidth >= 55 && nodeHeight >= 36 ? (
                        <span className="text-[8px] sm:text-[9px] font-bold text-foreground truncate min-w-0">
                          {formatCurrency(node.value || 0)}
                        </span>
                      ) : null}
                      {percentText && (
                        <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground ml-auto shrink-0 leading-none">
                          {percentText}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Micro tile */
                  <div className="flex items-end justify-end h-full w-full p-0.5">
                    {percentText && (
                      <span className="text-[7px] sm:text-[8px] font-bold text-muted-foreground/80 leading-none">
                        {percentText}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        {/* Empty state or loading */}
        {root && (!root.children || root.children.length === 0 || totalValue === 0) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-sm border border-dashed border-white/10 rounded-xl gap-2 p-4 text-center">
            <p>Nenhuma despesa para exibir neste período.</p>
          </div>
        )}

        {!root && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
            <span className="animate-pulse">Carregando mapa de despesas...</span>
          </div>
        )}
      </div>
    </div>
  );
}
