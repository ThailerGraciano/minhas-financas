'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { adjustInvoice } from '@/app/actions/credit-cards';
import { Loader2, Settings2, TrendingUp, TrendingDown, Check } from 'lucide-react';

interface AdjustInvoiceDialogProps {
  creditCardId: number;
  competencyMonth: string;
  totalAmount: number;
}

export function AdjustInvoiceDialog({ creditCardId, competencyMonth, totalAmount }: AdjustInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [realAmount, setRealAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const difference = realAmount - totalAmount;
  const absDifference = Math.abs(difference);
  const hasNoDifference = Math.abs(difference) < 0.01;
  const isIncrease = difference > 0;

  const handleRealAmountChange = useCallback((value: number) => {
    setRealAmount(value);
  }, []);

  const handleSubmit = async () => {
    if (realAmount <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    if (hasNoDifference) {
      setOpen(false);
      return;
    }

    setIsSubmitting(true);
    const result = await adjustInvoice(creditCardId, competencyMonth, realAmount);
    setIsSubmitting(false);

    if (result.success) {
      setOpen(false);
      setRealAmount(0);
    } else {
      alert(result.error || 'Erro ao ajustar fatura');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setRealAmount(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto gap-2">
          <Settings2 className="w-4 h-4" />
          Ajustar Fatura
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar Valor da Fatura</DialogTitle>
          <DialogDescription>
            Informe o valor real da fatura (conforme o app do seu banco/cartão). Se houver diferença, uma transação de ajuste será criada automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Valor calculado atual:</span>
            <span className="font-semibold">{formatCurrency(totalAmount)}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="real-amount">Valor Real da Fatura (R$)</Label>
            <CurrencyInput
              id="real-amount"
              name="realAmount"
              onValueChange={handleRealAmountChange}
              required
            />
          </div>

          {realAmount > 0 && (
            <div className={`flex items-center justify-between p-3 rounded-lg border ${
              hasNoDifference
                ? 'bg-green-500/10 border-green-500/30'
                : isIncrease
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="flex items-center gap-2">
                {hasNoDifference ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : isIncrease ? (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-blue-500" />
                )}
                <span className="text-sm font-medium">
                  {hasNoDifference
                    ? 'Valores iguais — sem ajuste necessário'
                    : isIncrease
                      ? 'Será criado um ajuste de fatura'
                      : 'Será criado um adiantamento de fatura'}
                </span>
              </div>
              {!hasNoDifference && (
                <span className={`font-bold ${isIncrease ? 'text-red-500' : 'text-blue-500'}`}>
                  {isIncrease ? '+' : '-'}{formatCurrency(absDifference)}
                </span>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting} disabled={realAmount <= 0 || hasNoDifference || isSubmitting}
          >
            
            Confirmar Ajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
