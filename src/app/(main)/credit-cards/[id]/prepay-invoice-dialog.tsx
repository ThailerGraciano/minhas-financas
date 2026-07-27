'use client';

import { useState } from 'react';
import { format } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DatePicker } from '@/components/ui/date-picker';
import { prepayInvoice } from '@/app/actions/credit-cards';
import { Loader2, ArrowUpCircle } from 'lucide-react';

interface Account {
  id: number;
  name: string;
  type: string;
  currentBalance: string | null;
}

interface PrepayInvoiceDialogProps {
  creditCardId: number;
  competencyMonth: string;
  pendingAmount: number;
  accounts: Account[];
}

export function PrepayInvoiceDialog({ creditCardId, competencyMonth, pendingAmount, accounts }: PrepayInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handlePay = async (formData: FormData) => {
    const amountStr = formData.get('amount') as string;
    const dateStr = formData.get('date') as string;
    const amount = Number(amountStr);

    if (!selectedAccountId || isNaN(amount) || amount <= 0) {
      alert('Preencha um valor válido maior que zero.');
      return;
    }
    
    if (amount > pendingAmount) {
      alert(`O valor máximo para adiantamento é de ${formatCurrency(pendingAmount)}`);
      return;
    }

    setIsSubmitting(true);
    const result = await prepayInvoice(creditCardId, competencyMonth, selectedAccountId, amount, dateStr);
    setIsSubmitting(false);
    
    if (result.success) {
      setOpen(false);
    } else {
      alert(result.error || 'Erro ao adiantar fatura');
    }
  };

  if (pendingAmount <= 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto gap-2">
          <ArrowUpCircle className="w-4 h-4" />
          Adiantar Valor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adiantar Fatura</DialogTitle>
          <DialogDescription>
            Pague um valor parcial antecipado para reduzir o saldo devedor da fatura de {competencyMonth}. O saldo pendente atual é de <strong className="text-foreground">{formatCurrency(pendingAmount)}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form action={handlePay}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prepay-amount">Valor a Adiantar (R$)</Label>
              <CurrencyInput 
                id="prepay-amount"
                name="amount"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prepay-date">Data do Adiantamento</Label>
              <DatePicker 
                id="prepay-date"
                name="date"
                defaultValue={format(new Date(), 'yyyy-MM-dd')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prepay-account">Conta Bancária de Origem</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger id="prepay-account">
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      {acc.name} ({formatCurrency(Number(acc.currentBalance))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!selectedAccountId || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Adiantamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
