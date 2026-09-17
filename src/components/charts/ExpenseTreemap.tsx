"use client";

import { TreemapDataSets, TreemapNode } from "@/app/actions/dashboard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hierarchy, HierarchyRectangularNode, treemap } from "d3-hierarchy";
import { ChevronRight } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useMeasure } from "react-use";

interface ExpenseTreemapProps {
  data: TreemapDataSets;
}

// Function to generate consistent colors based on string hash
const stringToColorClass = (str: string) => {
  const colors = [
    { bg: "bg-blue-500/10", border: "border-blue-500/25", text: "text-blue-500" },
    { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-500" },
    { bg: "bg-purple-500/10", border: "border-purple-500/25", text: "text-purple-500" },
    { bg: "bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-500" },
    { bg: "bg-rose-500/10", border: "border-rose-500/25", text: "text-rose-500" },
    { bg: "bg-indigo-500/10", border: "border-indigo-500/25", text: "text-indigo-500" },
    { bg: "bg-cyan-500/10", border: "border-cyan-500/25", text: "text-cyan-500" },
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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
    if (!width || !height || !currentRoot) return null;

    const h = hierarchy<TreemapNode>(currentRoot)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const tree = treemap<TreemapNode>().size([width, height]).padding(1.5).paddingInner(1.5);

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

  return (
    <div className="flex flex-col w-full space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground overflow-x-auto pb-1 shrink-0">
          {path.map((step, index) => (
            <React.Fragment key={index}>
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(index)}
                className={`hover:text-foreground transition-colors whitespace-nowrap ${
                  index === path.length - 1 ? "font-semibold text-foreground" : ""
                }`}
              >
                {step.name}
              </button>
              {index < path.length - 1 && <ChevronRight className="w-4 h-4 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* Filter */}
        <div className="w-[160px] sm:w-[180px]">
          <Select
            value={filterType}
            onValueChange={(val) => {
              if (isTreemapDatasetKey(val)) {
                setFilterType(val);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="variable">Variáveis</SelectItem>
              <SelectItem value="installment">Parceladas</SelectItem>
              <SelectItem value="fixed">Fixas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Treemap Container */}
      <div ref={ref} className="relative w-full h-[500px]">
        {root &&
          root.children?.map((node, i) => {
            const nodeWidth = Math.max(0, node.x1 - node.x0);
            const nodeHeight = Math.max(0, node.y1 - node.y0);

            // Only render if it's large enough to be visible
            if (nodeWidth < 2 || nodeHeight < 2) return null;

            const hasChildren = !!node.data.children && node.data.children.length > 0;
            // Use the parent's name or its own name to define the color consistently
            const colorName = path.length === 1 ? node.data.name : path[1].name;
            const color = stringToColorClass(colorName);

            const totalValue = root.value || 0;
            const percent = totalValue > 0 && node.value ? Math.round((node.value / totalValue) * 100) : 0;
            const percentText = percent > 0 ? `${percent}%` : null;

            return (
              <div
                key={node.data.id || `${node.data.name}-${i}`}
                onClick={() => handleNodeClick(node)}
                title={`${node.data.name}: ${formatCurrency(node.value || 0)}${percentText ? ` (${percentText})` : ""}`}
                className={`absolute border rounded-md p-1 transition-all duration-200 overflow-hidden ${
                  hasChildren ? "cursor-pointer hover:opacity-85 shadow-sm" : "cursor-default"
                } ${color.bg} ${color.border}`}
                style={{
                  left: node.x0,
                  top: node.y0,
                  width: nodeWidth,
                  height: nodeHeight,
                }}
              >
                <div className="flex flex-col items-center justify-center w-full h-full text-center select-none">
                  {nodeWidth > 55 && nodeHeight > 25 && (
                    <span className={`font-semibold text-xs sm:text-sm truncate w-full px-1 ${color.text}`}>
                      {node.data.name}
                    </span>
                  )}
                  {nodeHeight > 45 && nodeWidth > 65 && (
                    <span className="text-[11px] sm:text-xs text-muted-foreground truncate font-medium mt-0.5 w-full px-1">
                      {formatCurrency(node.value || 0)}
                      {percentText && nodeWidth > 95 ? ` (${percentText})` : ""}
                    </span>
                  )}
                  {nodeHeight > 60 && nodeWidth <= 95 && percentText && (
                    <span className="text-[10px] text-muted-foreground font-semibold">{percentText}</span>
                  )}
                </div>
              </div>
            );
          })}

        {root && (!root.children || root.children.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-xl">
            Nenhum dado encontrado para este nível.
          </div>
        )}
      </div>
    </div>
  );
}
