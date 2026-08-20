'use client';

import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { payFullInvoice } from '@/app/actions/credit-cards';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface Account {
  id: number;
  name: string;
  type: string;
  currentBalance: string | null;
}

interface PayInvoiceDialogProps {
  creditCardId: number;
  competencyMonth: string;
  pendingAmount: number;
  accounts: Account[];
}

export function PayInvoiceDialog({ creditCardId, competencyMonth, pendingAmount, accounts }: PayInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handlePay = async () => {
    if (!selectedAccountId) return;
    setIsSubmitting(true);
    const result = await payFullInvoice(creditCardId, competencyMonth, selectedAccountId);
    setIsSubmitting(false);
    
    if (result.success) {
      setOpen(false);
    } else {
      alert(result.error || 'Erro ao pagar fatura');
    }
  };

  if (pendingAmount <= 0) {
    return (
      <Button disabled className="w-full sm:w-auto gap-2">
        <CheckCircle2 className="w-4 h-4" />
        Fatura Paga
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">Pagar Fatura Completa</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar Fatura</DialogTitle>
          <DialogDescription>
            Confirme o pagamento da fatura de {competencyMonth}. O valor de <strong className="text-foreground">{formatCurrency(pendingAmount)}</strong> será debitado da conta selecionada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="account">Conta Bancária de Origem</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger id="account">
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handlePay} isLoading={isSubmitting} disabled={!selectedAccountId || isSubmitting}>
            
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
