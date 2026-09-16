"use client";

import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useRef } from "react";

export interface DayItem {
  date: string;
  total_expenses?: number;
  total_incomes?: number;
  projected_balance?: number;
}

interface DaySelectorCarouselProps {
  days: DayItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function DaySelectorCarousel({ days, selectedDate, onSelectDate }: DaySelectorCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [selectedDate]);

  return (
    <div ref={containerRef} className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide py-2 px-1 w-full -mx-1">
      {days.map((item) => {
        const parsedDate = parseISO(item.date);
        const weekday = format(parsedDate, "EEE", { locale: ptBR }).toUpperCase().replace(".", "");
        const dayNumber = format(parsedDate, "dd");
        const isActive = item.date === selectedDate;

        return (
          <button
            key={item.date}
            ref={isActive ? activeRef : undefined}
            type="button"
            onClick={() => onSelectDate(item.date)}
            className={cn(
              "flex flex-col items-center justify-center shrink-0 w-15 sm:w-16 py-3 px-2 rounded-2xl transition-all cursor-pointer select-none",
              isActive
                ? "border-2 border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20 scale-[1.02]"
                : "border border-white/10 bg-card hover:bg-muted/40 hover:border-white/20 text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wider mb-1",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {weekday}
            </span>
            <span
              className={cn(
                "text-lg sm:text-xl font-bold leading-none",
                isActive ? "text-primary font-black" : "text-foreground",
              )}
            >
              {dayNumber}
            </span>

            {/* Ponto de destaque abaixo do número no dia Ativo */}
            <div className="h-2 flex items-center justify-center mt-1">
              {isActive ? (
                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-sm shadow-primary" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
