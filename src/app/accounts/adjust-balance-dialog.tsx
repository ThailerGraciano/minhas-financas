'use client';

import { useState, useTransition } from 'react';
import { SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { adjustAccountBalance } from '@/app/actions/accounts';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Account = {
  id: number;
  name: string;
  currentBalance: string;
};

interface AdjustBalanceDialogProps {
  account: Account;
  trigger?: React.ReactNode;
}

export function AdjustBalanceDialog({ account, trigger }: AdjustBalanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [realBalance, setRealBalance] = useState<number>(Number(account.currentBalance));
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  // Reset state when dialog opens
  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (value) {
      setRealBalance(Number(account.currentBalance));
      setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    startTransition(async () => {
      const result = await adjustAccountBalance(account.id, realBalance);
      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error ?? 'Erro ao ajustar saldo.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Reajustar Saldo
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Reajustar Saldo
            </DialogTitle>
            <DialogDescription>
              {account.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-5">
            <div className="grid gap-2">
              <Label htmlFor="realBalance">Saldo Real no Banco</Label>
              <CurrencyInput
                id="realBalance"
                name="realBalance"
                value={realBalance}
                onValueChange={setRealBalance}
                required
              />
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Isso criará uma transação de ajuste automático para sincronizar
                seu saldo.
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Ajustando...' : 'Confirmar Ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
