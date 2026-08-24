import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAllocationSettings } from '@/app/actions/allocations';
import { AllocationConfigDialog } from '@/components/allocation-config-dialog';
import { Wallet } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    <Card className="mt-6 border-primary/20 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div className="space-y-1.5">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Distribuição Sugerida para o Fim de {capitalizedMonth}
          </CardTitle>
          <CardDescription className="text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Saldo Projetado: <strong className="text-foreground">{formatBRL(projectedBalance)}</strong></span>
            <span className="hidden sm:inline text-border">|</span>
            <span>Retido na Conta: <strong className="text-foreground">{formatBRL(baseKeepAmount)}</strong></span>
            <span className="hidden sm:inline text-border">|</span>
            <span>Disponível para distribuir: <strong className="text-primary">{formatBRL(Math.max(0, distributableAmount))}</strong></span>
          </CardDescription>
        </div>
        <div className="shrink-0 self-start sm:self-auto">
          <AllocationConfigDialog initialData={{ baseKeepAmount, rules }} />
        </div>
      </CardHeader>
      
      <CardContent>
        {distributableAmount <= 0 ? (
          <div className="bg-muted/30 border border-dashed rounded-lg p-6 text-center text-muted-foreground text-sm">
            Não há saldo projetado suficiente para distribuição após reter o valor base de {formatBRL(baseKeepAmount)}.
          </div>
        ) : rules.length === 0 ? (
          <div className="bg-muted/30 border border-dashed rounded-lg p-6 text-center text-muted-foreground text-sm">
            Nenhuma regra configurada. O valor excedente permanecerá na conta.
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {rules.map((rule) => {
              const ruleAmount = distributableAmount * (rule.percentage / 100);
              return (
                <div key={rule.id} className="bg-card border border-white/5 rounded-2xl p-5 hover:border-primary/30 transition-colors">
                  {/* Linha Superior do Card */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm sm:text-base truncate pr-2 text-foreground" title={rule.name}>
                      {rule.name}
                    </span>
                    <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center border-2 border-primary/30 text-xs font-bold text-primary bg-primary/5">
                      {rule.percentage}%
                    </div>
                  </div>
                  
                  {/* Linha Inferior do Card */}
                  <div className="text-xl sm:text-2xl font-bold mt-4 text-primary truncate" title={formatBRL(ruleAmount)}>
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
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
