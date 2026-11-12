import { cn } from "@/lib/utils";
import React from "react";

export interface SelectableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  selected?: boolean;
  layout?: "vertical" | "horizontal";
  activeAccent?: {
    primary: string;
    border: string;
    elevatedBg: string;
    glow?: string;
  };
}

export function SelectableCard({
  icon,
  title,
  subtitle,
  selected = false,
  layout = "vertical",
  activeAccent,
  className,
  style,
  ...props
}: SelectableCardProps) {
  const dynamicStyle = selected && activeAccent
    ? {
        borderColor: activeAccent.border,
        backgroundColor: activeAccent.elevatedBg,
        boxShadow: activeAccent.glow
          ? `inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 16px ${activeAccent.glow}`
          : "inset 0 1px 0 rgba(255,255,255,0.08)",
        ...style,
      }
    : {
        background: "rgba(16, 26, 42, 0.8)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        ...style,
      };

  return (
    <div
      className={cn(
        "relative flex border rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden",
        layout === "vertical" ? "flex-col p-3.5 sm:p-4" : "flex-row items-center p-3 gap-3",
        selected
          ? !activeAccent && "border-primary bg-primary/10 ring-1 ring-primary/20"
          : "border-white/[0.08] hover:border-white/20 hover:bg-[#151F31]/80",
        className
      )}
      style={dynamicStyle}
      {...props}
    >
      {/* Radio indicator (top right for vertical, right edge for horizontal) */}
      <div
        className={cn(
          "absolute rounded-full border transition-colors flex items-center justify-center",
          layout === "vertical" ? "top-3 right-3 w-4 h-4" : "right-3 top-1/2 -translate-y-1/2 w-4 h-4",
          selected ? (!activeAccent && "border-primary bg-primary") : "border-white/20 bg-black/20"
        )}
        style={
          selected && activeAccent
            ? {
                borderColor: activeAccent.primary,
                backgroundColor: activeAccent.primary,
              }
            : undefined
        }
      >
        {selected && <div className="w-1.5 h-1.5 bg-[#0B1220] rounded-full" />}
      </div>

      {icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl transition-colors",
            layout === "vertical" ? "w-9 h-9 sm:w-10 sm:h-10 mb-2.5 sm:mb-3" : "w-9 h-9 sm:w-10 sm:h-10 shrink-0",
            selected ? (!activeAccent && "text-primary bg-primary/15") : "text-white/60 bg-white/[0.05]"
          )}
          style={
            selected && activeAccent
              ? {
                  color: activeAccent.primary,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                }
              : undefined
          }
        >
          {icon}
        </div>
      )}

      <div className={cn("flex flex-col min-w-0", layout === "horizontal" && "flex-1 pr-6")}>
        <span
          className={cn(
            "font-semibold truncate leading-tight transition-colors text-sm",
            selected ? "text-[#F2F5FA]" : "text-white/70"
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span className="text-xs text-white/45 truncate mt-1">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

