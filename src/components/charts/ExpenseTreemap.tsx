'use client';

import React, { useMemo, useState } from 'react';
import { hierarchy, treemap, HierarchyRectangularNode } from 'd3-hierarchy';
import { useMeasure } from 'react-use';
import { ChevronRight } from 'lucide-react';
import { TreemapNode } from '@/app/actions/dashboard';

interface ExpenseTreemapProps {
  data: TreemapNode;
}

// Function to generate consistent colors based on string hash
const stringToColorClass = (str: string) => {
  const colors = [
    { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
    { bg: 'emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500' },
    { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500' },
    { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500' },
    { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-500' },
    { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-500' },
    { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-500' },
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export function ExpenseTreemap({ data }: ExpenseTreemapProps) {
  const [ref, { width, height }] = useMeasure<HTMLDivElement>();
  
  const [currentRoot, setCurrentRoot] = useState<TreemapNode>(data);
  const [path, setPath] = useState<{ name: string; data: TreemapNode }[]>([
    { name: 'Geral', data: data },
  ]);

  // Update root and path if data prop changes (e.g. month changed)
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentRoot(data);
    setPath([{ name: 'Geral', data: data }]);
  }, [data]);

  const root = useMemo(() => {
    if (!width || !height || !currentRoot) return null;

    const h = hierarchy<TreemapNode>(currentRoot)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const tree = treemap<TreemapNode>()
      .size([width, height])
      .padding(4)
      .paddingInner(4);

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
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground overflow-x-auto pb-2 shrink-0">
        {path.map((step, index) => (
          <React.Fragment key={index}>
            <button
              onClick={() => handleBreadcrumbClick(index)}
              className={`hover:text-foreground transition-colors whitespace-nowrap ${
                index === path.length - 1 ? 'font-semibold text-foreground' : ''
              }`}
            >
              {step.name}
            </button>
            {index < path.length - 1 && <ChevronRight className="w-4 h-4 shrink-0" />}
          </React.Fragment>
        ))}
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

            return (
              <div
                key={node.data.id || `${node.data.name}-${i}`}
                onClick={() => handleNodeClick(node)}
                className={`absolute border rounded p-1 transition-all duration-300 overflow-hidden ${
                  hasChildren ? 'cursor-pointer hover:opacity-80 shadow-sm' : 'cursor-default'
                } ${color.bg} ${color.border}`}
                style={{
                  left: node.x0,
                  top: node.y0,
                  width: nodeWidth,
                  height: nodeHeight,
                }}
              >
                <div className="flex flex-col items-center justify-center w-full h-full text-center">
                  {nodeWidth > 60 && nodeHeight > 30 && (
                    <span className={`font-semibold text-sm truncate w-full px-1 ${color.text}`}>
                      {node.data.name}
                    </span>
                  )}
                  {nodeHeight > 50 && nodeWidth > 70 && (
                    <span className="text-xs text-muted-foreground truncate font-medium mt-1 w-full px-1">
                      {formatCurrency(node.value || 0)}
                    </span>
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
