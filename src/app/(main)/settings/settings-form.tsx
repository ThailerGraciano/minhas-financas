'use client';

import { useState } from 'react';
import { updateClosingDay } from '@/app/actions/settings';
import { fixAllCompetencies, backfillInvoiceMonths } from '@/app/actions/transactions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsForm({ initialClosingDay }: { initialClosingDay: number }) {
  const [isPending, setIsPending] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setMessage('');

    const formData = new FormData(e.currentTarget);
    const closingDay = Number(formData.get('closingDay'));

    const result = await updateClosingDay(closingDay);
    
    if (result.success) {
      setMessage('Configurações salvas com sucesso!');
      toast.success('Configurações salvas com sucesso!');
    } else {
      setMessage('Erro ao salvar as configurações.');
      toast.error('Erro ao salvar as configurações.');
    }
    
    setIsPending(false);
  };

  const handleFixFaturas = async () => {
    setIsFixing(true);
    try {
      const res = await fixAllCompetencies();
      if (res.success) {
        toast.success(`${res.count} faturas antigas foram corrigidas.`);
      }
    } catch (e) {
      toast.error("Erro ao corrigir faturas.");
    }
    setIsFixing(false);
  };

  const handleBackfillInvoice = async () => {
    setIsBackfilling(true);
    try {
      const res = await backfillInvoiceMonths();
      if (res.success) {
        toast.success(`${res.count} transações antigas de cartão foram preenchidas com invoice_month.`);
      }
    } catch (e) {
      toast.error("Erro ao preencher meses de fatura.");
    }
    setIsBackfilling(false);
  };

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-md mt-8">
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
          <CardDescription>Gerencie suas preferências do sistema.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="closingDay">Dia de Fechamento do Mês</Label>
              <Input 
                id="closingDay" 
                name="closingDay" 
                type="number" 
                min="1" 
                max="31" 
                defaultValue={initialClosingDay}
                required 
              />
              <p className="text-sm text-muted-foreground">
                Usado para calcular os totais mensais baseados em quando o seu mês contábil &quot;vira&quot;.
              </p>
            </div>
            {message && (
              <p className={`text-sm font-medium ${message.includes('Erro') ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                {message}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" isLoading={isPending} disabled={isPending}>
              
              {isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Botão Temporário para correção de banco de dados */}
      <Card className="w-full max-w-md border-orange-500/20 bg-orange-500/5">
        <CardHeader>
          <CardTitle className="text-orange-600">Correções Manuais (Temporário)</CardTitle>
          <CardDescription>Ações de administração de dados.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={handleFixFaturas} 
            disabled={isFixing}
            className="w-full border-orange-500/50 text-orange-600 hover:bg-orange-500/10 hover:text-orange-700"
          >
            
            Corrigir Todas as Competências
          </Button>
          <Button 
            variant="outline" 
            onClick={handleBackfillInvoice} 
            disabled={isBackfilling}
            className="w-full border-orange-500/50 text-orange-600 hover:bg-orange-500/10 hover:text-orange-700 mt-2"
          >
            
            Restaurar Faturas Antigas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
