import { getAllocationSettings } from "@/app/actions/allocations";
import { AllocationConfigDialog } from "@/components/allocation-config-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet } from "lucide-react";

interface BalanceAllocatorProps {
  projectedBalance: number;
  competencyMonth?: string;
}

export async function BalanceAllocator({ projectedBalance, competencyMonth }: BalanceAllocatorProps) {
  const { baseKeepAmount, rules } = await getAllocationSettings();

  const distributableAmount = projectedBalance - baseKeepAmount;

  const safeMonth = competencyMonth || format(new Date(), "yyyy-MM");
  const dateObj = parse(safeMonth, "yyyy-MM", new Date());
  const monthName = format(dateObj, "MMMM", { locale: ptBR });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <Card className="rounded-[1.5rem] sm:rounded-[2rem] border-white/10 shadow-sm bg-card overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-5 sm:px-6">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
          <Wallet className="w-5 h-5 text-primary" />
          Distribuição Sugerida para o Fim de {capitalizedMonth}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-5 sm:px-6 pb-6 pt-0 space-y-4">
        {/* Resumo Superior: 3 linhas de totalizadores textuais */}
        <div className="space-y-2 py-3.5 px-4 sm:px-5 bg-muted/20 border border-white/5 rounded-2xl">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-muted-foreground font-medium">Saldo Projetado:</span>
            <span className="font-semibold text-foreground tabular-nums">{formatBRL(projectedBalance)}</span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-muted-foreground font-medium">Retido na Conta:</span>
            <span className="font-semibold text-foreground tabular-nums">{formatBRL(baseKeepAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm border-t border-white/5 pt-2">
            <span className="font-bold text-foreground">Disponível para distribuir:</span>
            <span className="font-bold text-primary text-base sm:text-lg tabular-nums">
              {formatBRL(Math.max(0, distributableAmount))}
            </span>
          </div>
        </div>

        {/* Botão Configurar Distribuição ocupando a largura total (full width) */}
        <div>
          <AllocationConfigDialog initialData={{ baseKeepAmount, rules }} />
        </div>

        {/* Grid de Metas em 2 colunas (grid-cols-2) */}
        {distributableAmount <= 0 ? (
          <div className="bg-muted/15 border border-dashed border-white/10 rounded-2xl px-4 py-8 text-center text-muted-foreground text-xs sm:text-sm">
            Não há saldo projetado suficiente para distribuição após reter o valor base de {formatBRL(baseKeepAmount)}.
          </div>
        ) : rules.length === 0 ? (
          <div className="bg-muted/15 border border-dashed border-white/10 rounded-2xl px-4 py-8 text-center text-muted-foreground text-xs sm:text-sm">
            Nenhuma regra configurada. O valor excedente permanecerá na conta.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4 pt-1">
            {rules.map((rule) => {
              const ruleAmount = distributableAmount * (rule.percentage / 100);
              return (
                <div
                  key={rule.id}
                  className="bg-card border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-sm group"
                >
                  <div>
                    {/* Linha Superior: Título e Badge com fundo laranja translúcido */}
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors"
                        title={rule.name}
                      >
                        {rule.name}
                      </span>
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/25 border-transparent font-bold text-xs shrink-0 px-2 py-0.5 rounded-full">
                        {rule.percentage}%
                      </Badge>
                    </div>

                    {/* Subcategoria / Meta */}
                    <span className="text-[11px] text-muted-foreground block mt-1">Meta de Reserva</span>
                  </div>

                  {/* Valor Calculado Destacado */}
                  <div
                    className="text-lg sm:text-xl font-black mt-3.5 text-foreground tabular-nums tracking-tight"
                    title={formatBRL(ruleAmount)}
                  >
                    {formatBRL(ruleAmount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
