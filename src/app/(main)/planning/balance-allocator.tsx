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
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {rules.map((rule) => {
              const ruleAmount = distributableAmount * (rule.percentage / 100);
              return (
                <Card key={rule.id} className="bg-card shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium truncate pr-2 text-muted-foreground" title={rule.name}>
                        {rule.name}
                      </CardTitle>
                      <Badge variant="secondary" className="shrink-0 font-medium">
                        {rule.percentage}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold text-foreground">
                      {formatBRL(ruleAmount)}
                    </div>
                  </CardContent>
                </Card>
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
