import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import React from "react";
import { type TransactionFormField } from "./types";

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
        "rounded-2xl p-4 sm:p-5 transition-all duration-200 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_16px_rgba(0,0,0,0.25)] backdrop-blur-md",
        elevated ? "bg-[var(--card-elevated)]/75" : "bg-card/70",
        className
      )}
      style={style}
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
  error?: string;
  required?: boolean;
  fieldName?: TransactionFormField;
}

export const Field = React.memo(function Field({
  label,
  children,
  className,
  error,
  required,
  fieldName,
}: FieldProps) {
  const renderedLabel =
    typeof label === "string" ? (
      <span>
        {label}
        {required ? (
          <span className="text-destructive ml-0.5" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
    ) : (
      label
    );

  return (
    <div data-field={fieldName} className={cn("flex flex-col gap-2", className)}>
      <Label className={cn("text-xs font-medium", error ? "text-destructive" : "text-muted-foreground")}>
        {renderedLabel}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
});

