"use client";

import { addMonths, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";

interface CompetencyFilterProps {
  /** Dia de fechamento do ciclo financeiro (ex: 25) */
  closingDay: number;
}

/**
 * Filtro de competência (mês/ano) com setas de navegação e select.
 * Usa searchParams (?month=YYYY-MM) para persistir o estado na URL,
 * permitindo que Server Components leiam o mês diretamente.
 */
export function CompetencyFilter({ closingDay }: CompetencyFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentMonth = searchParams.get("month") || format(new Date(), "yyyy-MM");
  const currentDate = new Date(`${currentMonth}-01T00:00:00`);

  // Gera opções: 12 meses passados + mês atual + 12 meses futuros
  const monthOptions = useMemo(() => {
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
  }, []);

  const navigateToMonth = (monthStr: string) => {
    const params = new URLSearchParams(searchParams.toString());
    // Se for o mês atual, remove o param para URL limpa
    if (monthStr === format(new Date(), "yyyy-MM")) {
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

  const displayLabel = format(currentDate, "MMMM yyyy", { locale: ptBR });
  const capitalizedLabel = displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1);

  // Calcula o intervalo do ciclo para exibição
  const cycleStart = closingDay + 1;
  const cycleEnd = closingDay;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={goToPrevMonth}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="relative">
          <select
            value={currentMonth}
            onChange={(e) => navigateToMonth(e.target.value)}
            className="appearance-none bg-transparent text-sm font-semibold px-3 py-1.5 pr-7 cursor-pointer focus:outline-none capitalize min-w-[160px] text-center"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Calendar className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={goToNextMonth}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <span className="text-xs text-muted-foreground hidden sm:inline">
        Ciclo: dia {cycleStart} ao dia {cycleEnd}
      </span>
    </div>
  );
}
