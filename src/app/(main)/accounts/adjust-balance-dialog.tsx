'use client';

import { useState, useTransition } from 'react';
import { SlidersHorizontal, AlertTriangle, Info, Loader2 } from 'lucide-react';
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function AdjustBalanceDialog({
  account,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger
}: AdjustBalanceDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const [realBalance, setRealBalance] = useState<number>(Number(account.currentBalance));
  const [adjustmentMode, setAdjustmentMode] = useState<'transaction' | 'initial_balance'>('transaction');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  // Reset state when dialog opens
  const handleOpenChange = (value: boolean) => {
    if (isControlled && controlledOnOpenChange) {
      controlledOnOpenChange(value);
    } else {
      setUncontrolledOpen(value);
    }

    if (value) {
      setRealBalance(Number(account.currentBalance));
      setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    startTransition(async () => {
      const createTransaction = adjustmentMode === 'transaction';
      const result = await adjustAccountBalance(account.id, realBalance, createTransaction);
      if (result.success) {
        handleOpenChange(false);
      } else {
        setError(result.error ?? 'Erro ao ajustar saldo.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Reajustar Saldo
            </Button>
          )}
        </DialogTrigger>
      )}

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

            <div className="grid gap-3">
              <Label className="text-muted-foreground ml-1">Opção de Ajuste</Label>
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/20 border border-border/50">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={adjustmentMode === "transaction"}
                    onChange={() => setAdjustmentMode("transaction")}
                    className="accent-primary h-4 w-4"
                  />
                  Criar transação de ajuste
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={adjustmentMode === "initial_balance"}
                    onChange={() => setAdjustmentMode("initial_balance")}
                    className="accent-primary h-4 w-4"
                  />
                  Apenas corrigir valor inicial
                </label>
              </div>
            </div>

            {adjustmentMode === "transaction" ? (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Isso criará uma transação de ajuste automático no seu histórico para sincronizar seu saldo.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-600 dark:text-blue-400">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  O saldo será corrigido diretamente, sem criar nenhuma transação no histórico.
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isPending} disabled={isPending}>
              
              {isPending ? 'Ajustando...' : 'Confirmar Ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
