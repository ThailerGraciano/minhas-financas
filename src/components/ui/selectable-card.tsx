import { cn } from "@/lib/utils";
import React from "react";

interface SelectableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  selected?: boolean;
  layout?: "vertical" | "horizontal";
}

export function SelectableCard({
  icon,
  title,
  subtitle,
  selected = false,
  layout = "vertical",
  className,
  ...props
}: SelectableCardProps) {
  return (
    <div
      className={cn(
        "relative flex bg-[#1A1A22] border rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden",
        layout === "vertical" ? "flex-col p-4" : "flex-row items-center p-3 gap-3",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-white/5 hover:border-white/10 hover:bg-white/5",
        className
      )}
      {...props}
    >
      {/* Radio indicator (top right for vertical, right edge for horizontal) */}
      <div
        className={cn(
          "absolute rounded-full border transition-colors flex items-center justify-center",
          layout === "vertical" ? "top-3 right-3 w-4 h-4" : "right-3 top-1/2 -translate-y-1/2 w-4 h-4",
          selected ? "border-primary bg-primary" : "border-white/10"
        )}
      >
        {selected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
      </div>

      {icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl",
            layout === "vertical" ? "w-10 h-10 mb-3" : "w-10 h-10 shrink-0",
            selected ? "text-primary bg-primary/10" : "text-muted-foreground bg-white/5"
          )}
        >
          {icon}
        </div>
      )}

      <div className={cn("flex flex-col min-w-0", layout === "horizontal" && "flex-1 pr-6")}>
        <span
          className={cn(
            "font-medium truncate leading-tight transition-colors",
            layout === "vertical" ? "text-sm" : "text-sm",
            selected ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span className="text-xs text-muted-foreground truncate mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

