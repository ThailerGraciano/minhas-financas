"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

interface Account {
  id: number;
  name: string;
}

interface PlanningTemporalNavProps {
  closingDay: number;
  defaultMonth: string;
  accounts: Account[];
}

export function PlanningTemporalNav({ defaultMonth, accounts }: PlanningTemporalNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentMonth = searchParams.get("month") || defaultMonth || format(new Date(), "yyyy-MM");
  const currentAccountId = searchParams.get("accountId") || "checking_accounts";

  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const baseDate = defaultMonth ? parseISO(`${defaultMonth}-01`) : new Date();
    for (let i = -12; i <= 12; i++) {
      const d = addMonths(baseDate, i);
      const value = format(d, "yyyy-MM");
      const label = format(d, "MMMM yyyy", { locale: ptBR });
      options.push({
        value,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      });
    }
    return options;
  }, [defaultMonth]);

  const navigateToMonth = (monthStr: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (monthStr === defaultMonth) {
      params.delete("month");
    } else {
      params.set("month", monthStr);
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  };

  const goToPrevMonth = () => {
    const date = parseISO(`${currentMonth}-01`);
    const prev = subMonths(date, 1);
    navigateToMonth(format(prev, "yyyy-MM"));
  };

  const goToNextMonth = () => {
    const date = parseISO(`${currentMonth}-01`);
    const next = addMonths(date, 1);
    navigateToMonth(format(next, "yyyy-MM"));
  };

  const handleAccountChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "checking_accounts") {
      params.set("accountId", value);
    } else {
      params.delete("accountId");
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3.5 w-full py-1">
      {/* Seletor de Mês em Formato de Pílula Centralizado */}
      <div className="inline-flex items-center gap-2 bg-card/90 backdrop-blur-md border border-white/10 rounded-full px-2 py-1 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer transition-all active:scale-95"
          onClick={goToPrevMonth}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Select value={currentMonth} onValueChange={navigateToMonth}>
          <SelectTrigger className="h-8 border-0 bg-transparent shadow-none font-bold text-sm sm:text-base focus:ring-0 focus:ring-offset-0 capitalize min-w-[150px] text-center justify-center data-[state=open]:bg-white/5 cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="capitalize cursor-pointer">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer transition-all active:scale-95"
          onClick={goToNextMonth}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Considerar Saldo da Conta */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
        <span className="text-muted-foreground font-medium">Considerar saldo da conta:</span>
        <Select value={currentAccountId} onValueChange={handleAccountChange}>
          <SelectTrigger className="w-[230px] sm:w-[260px] h-9 rounded-xl border-white/10 bg-card text-xs sm:text-sm cursor-pointer shadow-sm">
            <SelectValue placeholder="Contas Correntes (Agrupado)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="checking_accounts" className="font-semibold text-primary cursor-pointer">
              Contas Correntes (Agrupado)
            </SelectItem>
            <SelectItem value="all" className="cursor-pointer">
              Todas as Contas
            </SelectItem>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id.toString()} className="cursor-pointer">
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
