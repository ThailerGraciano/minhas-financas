import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import React from "react";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevated?: boolean;
}

export const GlassCard = React.memo(function GlassCard({
  children,
  className,
  elevated = false,
  style,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 sm:p-5 transition-all duration-200",
        className
      )}
      style={{
        background: elevated ? "rgba(21, 31, 49, 0.72)" : "rgba(17, 26, 42, 0.65)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 4px 16px rgba(0, 0, 0, 0.25)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

export interface FieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Field = React.memo(function Field({
  label,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label className="text-xs font-medium text-[#A7B3C5]">{label}</Label>
      {children}
    </div>
  );
});

