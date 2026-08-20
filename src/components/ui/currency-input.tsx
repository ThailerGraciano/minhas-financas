"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange" | "defaultValue"> {
  /** The form field name — a hidden input with this name will hold the decimal value */
  name: string;
  /** Controlled decimal value (e.g. 12.50). If omitted, the component is uncontrolled. */
  value?: number;
  /** Default decimal value (uncontrolled initialization). */
  defaultValue?: number | string;
  /** Called with the new decimal value on every keystroke */
  onValueChange?: (value: number) => void;
}

/**
 * Currency input with a right-to-left filling mask (BRL).
 *
 * Typing "1" → R$ 0,01
 * Typing "2" → R$ 0,12
 * Typing "3" → R$ 1,23
 *
 * The hidden <input name={name}> always holds the decimal string (e.g. "1.23").
 */
function CurrencyInput({
  name,
  value: controlledValue,
  defaultValue,
  onValueChange,
  className,
  id,
  required,
  placeholder,
  ...props
}: CurrencyInputProps) {
  // Internal state stores the value in **cents** (integer).
  const [cents, setCents] = React.useState<number>(() => {
    if (controlledValue !== undefined) {
      return Math.round(controlledValue * 100);
    }
    if (defaultValue !== undefined) {
      return Math.round(Number(defaultValue) * 100);
    }
    return 0;
  });

  // Sync if externally controlled value changes
  React.useEffect(() => {
    if (controlledValue !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCents(Math.round(controlledValue * 100));
    }
  }, [controlledValue]);

  const currentCents =
    controlledValue !== undefined
      ? Math.round(controlledValue * 100)
      : cents;

  const decimalValue = currentCents / 100;

  const displayValue = formatBRL(currentCents);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation / accessibility keys
    if (
      e.key === "Tab" ||
      e.key === "Enter" ||
      e.key === "Escape" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight"
    ) {
      return;
    }

    e.preventDefault();

    if (e.key === "Backspace") {
      const next = Math.floor(currentCents / 10);
      updateValue(next);
      return;
    }

    if (e.key === "Delete") {
      updateValue(0);
      return;
    }

    // Only accept digit keys
    if (/^[0-9]$/.test(e.key)) {
      // Prevent absurdly large values (max ~999.999.999,99)
      if (currentCents > 9_999_999_999) return;
      const next = currentCents * 10 + Number(e.key);
      updateValue(next);
    }
  };

  const updateValue = (newCents: number) => {
    setCents(newCents);
    onValueChange?.(newCents / 100);
  };

  // Prevent paste / manual input from bypassing the mask
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extract only digits from pasted content
    const raw = e.target.value.replace(/\D/g, "");
    if (raw) {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) {
        updateValue(parsed);
      }
    }
  };

  return (
    <>
      {/* Hidden input that holds the real decimal value for form submission */}
      <input type="hidden" name={name} value={decimalValue.toFixed(2)} />

      {/* Visible masked input */}
      <input
        {...props}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        data-slot="input"
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        value={currentCents === 0 ? "" : displayValue}
        placeholder={placeholder ?? "R$ 0,00"}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        required={required}
        // Make required validation work: if cents is 0 the field is "empty"
        // The hidden input always has a value, so we rely on the visible input for validation
        {...(required && currentCents === 0
          ? { "aria-invalid": true as const }
          : {})}
      />
    </>
  );
}

/** Format cents integer to BRL display string (e.g. 123 → "R$ 1,23") */
function formatBRL(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export { CurrencyInput };
