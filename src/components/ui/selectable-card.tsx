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
    subtleGlow?: string;
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
        background: `linear-gradient(145deg, ${activeAccent.elevatedBg} 0%, rgba(14, 14, 20, 0.90) 100%)`,
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: activeAccent.glow
          ? `inset 0 1px 1px 0 rgba(255, 255, 255, 0.28), inset 0 0 18px rgba(255, 255, 255, 0.03), 0 8px 28px -4px ${activeAccent.glow}`
          : "inset 0 1px 1px 0 rgba(255, 255, 255, 0.20)",
        ...style,
      }
    : {
        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%), var(--card)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 4px 12px rgba(0, 0, 0, 0.35)",
        ...style,
      };

  return (
    <div
      className={cn(
        "relative flex border rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden",
        layout === "vertical" ? "flex-col p-3.5 sm:p-4" : "flex-row items-center p-3 gap-3",
        selected
          ? !activeAccent && "border-primary bg-primary/10 ring-1 ring-primary/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]"
          : "border-white/[0.08] hover:border-white/25 hover:bg-white/[0.06] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]",
        className
      )}
      style={dynamicStyle}
      {...props}
    >
      {/* Top specular reflection shimmer (Apple Liquid Glass highlight) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      {/* Radio indicator (top right for vertical, right edge for horizontal) */}
      <div
        className={cn(
          "absolute rounded-full border transition-all duration-300 flex items-center justify-center",
          layout === "vertical" ? "top-3 right-3 w-4 h-4" : "right-3 top-1/2 -translate-y-1/2 w-4 h-4",
          selected ? (!activeAccent && "border-primary bg-primary") : "border-white/20 bg-black/40 backdrop-blur-md"
        )}
        style={
          selected && activeAccent
            ? {
                borderColor: activeAccent.primary,
                backgroundColor: activeAccent.primary,
                boxShadow: `0 0 10px ${activeAccent.primary}`,
              }
            : undefined
        }
      >
        {selected && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
      </div>

      {icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl transition-all duration-300 border",
            layout === "vertical" ? "w-9 h-9 sm:w-10 sm:h-10 mb-2.5 sm:mb-3" : "w-9 h-9 sm:w-10 sm:h-10 shrink-0",
            selected
              ? (!activeAccent && "text-primary bg-primary/15 border-primary/30")
              : "text-white/70 bg-white/[0.05] border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
          )}
          style={
            selected && activeAccent
              ? {
                  color: activeAccent.primary,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderColor: "rgba(255, 255, 255, 0.16)",
                  boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.20), 0 0 12px ${activeAccent.subtleGlow || activeAccent.glow || "transparent"}`,
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
            selected ? "text-foreground" : "text-foreground/75"
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span className="text-xs text-muted-foreground truncate mt-1">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

