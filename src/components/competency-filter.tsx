"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMonths, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface CompetencyFilterProps {
  /** Dia de fechamento do ciclo financeiro (ex: 25) */
  closingDay: number;
  /** Valor controlado opcional. Se passado, o componente não altera a URL. */
  value?: string;
  /** Mês padrão a ser assumido quando não houver valor na URL (fallback). */
  defaultMonth?: string;
  /** Callback para quando o mês muda. */
  onChange?: (month: string) => void;
}

/**
 * Filtro de competência (mês/ano) com setas de navegação e select.
 * Usa searchParams (?month=YYYY-MM) para persistir o estado na URL,
 * permitindo que Server Components leiam o mês diretamente.
 */
export function CompetencyFilter({ closingDay, value, defaultMonth, onChange }: CompetencyFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fallbackMonth = defaultMonth || format(new Date(), "yyyy-MM");

  // Se 'value' foi fornecido, usamos ele (controlled mode), senão usamos a URL
  const currentMonth = value !== undefined ? value : searchParams.get("month") || fallbackMonth;
  const currentDate = new Date(`${currentMonth}-01T00:00:00`);

  // Gera opções: 12 meses passados + mês atual + 12 meses futuros
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line
    setIsMounted(true);
  }, []);

  const monthOptions = isMounted
    ? (() => {
        const options: { value: string; label: string }[] = [];
        const now = new Date();

        for (let i = -12; i <= 12; i++) {
          const d = addMonths(now, i);
          const value = format(d, "yyyy-MM");
          const label = format(d, "MMMM yyyy", { locale: ptBR });
          options.push({
            value,
            label: label.charAt(0).toUpperCase() + label.slice(1),
          });
        }
        return options;
      })()
    : [];

  const navigateToMonth = (monthStr: string) => {
    if (onChange) {
      onChange(monthStr);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    // Se for o mês padrão configurado, remove o param para URL limpa
    if (monthStr === fallbackMonth) {
      params.delete("month");
    } else {
      params.set("month", monthStr);
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  };

  const goToPrevMonth = () => {
    const prev = subMonths(currentDate, 1);
    navigateToMonth(format(prev, "yyyy-MM"));
  };

  const goToNextMonth = () => {
    const next = addMonths(currentDate, 1);
    navigateToMonth(format(next, "yyyy-MM"));
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full hover:bg-background/50"
        onClick={goToPrevMonth}
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select value={currentMonth} onValueChange={navigateToMonth}>
        <SelectTrigger className="h-7 border-0 bg-transparent shadow-none font-semibold focus:ring-0 focus:ring-offset-0 capitalize text-xs sm:text-sm min-w-[130px] sm:min-w-[155px] px-1 text-center justify-center gap-1.5 whitespace-nowrap shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[180px]">
          {monthOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="capitalize">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full hover:bg-background/50"
        onClick={goToNextMonth}
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
