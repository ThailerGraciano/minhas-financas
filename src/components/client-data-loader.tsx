'use client';

import { useState, useEffect, ReactNode } from 'react';
import { CompetencyFilter } from '@/components/competency-filter';
import { getDefaultCompetencyMonth } from '@/lib/date-utils';
import { Loader2 } from 'lucide-react';

interface ClientDataLoaderProps<T> {
  closingDay: number;
  initialData: T;
  fetchAction: (month: string) => Promise<T>;
  children: (data: T, selectedMonth: string, isLoading: boolean) => ReactNode;
  headerContent?: ReactNode;
  initialMonth?: string;
}

export function ClientDataLoader<T>({
  closingDay,
  initialData,
  fetchAction,
  children,
  headerContent,
  initialMonth
}: ClientDataLoaderProps<T>) {
  const currentMonth = initialMonth || getDefaultCompetencyMonth(closingDay);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [prevInitialData, setPrevInitialData] = useState(initialData);

  // Sync state when server props change (e.g. after a Server Action)
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    if (selectedMonth === currentMonth) {
      setData(initialData);
    }
  }

  useEffect(() => {
    if (selectedMonth !== currentMonth) {
      let active = true;
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
    }
  }, [selectedMonth, currentMonth, fetchAction]);

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (month !== currentMonth) {
      setIsLoading(true);
    } else {
      setData(initialData);
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {headerContent ? <div className="flex-1 w-full">{headerContent}</div> : <div />}
        <div className="flex items-center gap-4 shrink-0">
          <CompetencyFilter 
            closingDay={closingDay} 
            value={selectedMonth} 
            onChange={handleMonthChange} 
          />
          {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className={isLoading ? "opacity-50 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200"}>
        {children(data, selectedMonth, isLoading)}
      </div>
    </>
  );
}
