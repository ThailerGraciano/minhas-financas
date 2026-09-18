"use client";

import { CompetencyFilter } from "@/components/competency-filter";
import { getDefaultCompetencyMonth } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";

interface ClientDataLoaderProps<T> {
  closingDay: number;
  initialData: T;
  fetchAction: (month: string) => Promise<T>;
  children: (data: T, selectedMonth: string, isLoading: boolean) => ReactNode;
  headerContent?: ReactNode | ((data: T, selectedMonth: string, isLoading: boolean) => ReactNode);
  headerActions?: ReactNode | ((data: T, selectedMonth: string, isLoading: boolean) => ReactNode);
  initialMonth?: string;
}

export function ClientDataLoader<T>({
  closingDay,
  initialData,
  fetchAction,
  children,
  headerContent,
  headerActions,
  initialMonth,
}: ClientDataLoaderProps<T>) {
  const currentMonth = initialMonth || getDefaultCompetencyMonth(closingDay);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  const isFirstRender = useRef(true);

  // Sync state when server props change (e.g. after a Server Action)
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    if (selectedMonth === currentMonth) {
      setData(initialData);
    }
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    let active = true;
    setIsLoading(true);
    fetchAction(selectedMonth)
      .then((newData) => {
        if (active) {
          setData(newData);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to load data:", error);
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedMonth, fetchAction]);

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {typeof headerContent === "function" ? (
          <div className="flex-1 w-full md:w-auto">{headerContent(data, selectedMonth, isLoading)}</div>
        ) : headerContent ? (
          <div className="flex-1 w-full md:w-auto hidden md:block">{headerContent}</div>
        ) : (
          <div className="hidden md:block" />
        )}
        <div
          className={cn(
            "flex items-center gap-2.5 w-full md:w-auto shrink-0 flex-wrap sm:flex-nowrap",
            headerActions ? "justify-between md:justify-end" : "justify-center md:justify-end",
          )}
        >
          <div className="rounded-full bg-secondary px-3 py-1 sm:py-1.5 flex items-center gap-1.5 shadow-sm border border-white/5 justify-center shrink-0">
            <CompetencyFilter closingDay={closingDay} value={selectedMonth} onChange={handleMonthChange} />
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />}
          </div>
          {typeof headerActions === "function" ? headerActions(data, selectedMonth, isLoading) : headerActions}
        </div>
      </div>

      <div
        className={
          isLoading
            ? "opacity-50 pointer-events-none transition-opacity duration-200"
            : "transition-opacity duration-200"
        }
      >
        {children(data, selectedMonth, isLoading)}
      </div>
    </>
  );
}
