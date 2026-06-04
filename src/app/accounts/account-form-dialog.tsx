'use client';

import { useState } from 'react';
import { createAccount, updateAccount } from '@/app/actions/accounts';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

type Account = {
  id: number;
  name: string;
  type: string;
  currentBalance: string;
};

export function AccountFormDialog({ accountToEdit, trigger }: { accountToEdit?: Account, trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const currentBalance = formData.get('currentBalance') as string;

    const result = accountToEdit 
      ? await updateAccount(accountToEdit.id, {
          name,
          type,
          currentBalance,
        })
      : await createAccount({
          name,
          type,
          currentBalance,
        });
    
    setIsPending(false);

    if (result.success) {
      setOpen(false);
    } else {
      setError(result.error || `Erro ao ${accountToEdit ? 'atualizar' : 'criar'} conta`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="cursor-pointer"><Plus className="w-4 h-4 mr-2 md:mr-2 pointer-events-none" /><span className="hidden md:inline pointer-events-none">Nova Conta</span><span className="md:hidden pointer-events-none">Conta</span></Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{accountToEdit ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            <DialogDescription>
              {accountToEdit ? 'Altere as informações da sua conta bancária.' : 'Adicione uma nova conta bancária ou carteira.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Conta</Label>
              <Input id="name" name="name" required placeholder="Ex: Nubank, Itaú..." defaultValue={accountToEdit?.name} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type" 
                name="type" 
                required
                defaultValue={accountToEdit?.type || 'checking'}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="checking">Conta Corrente</option>
                <option value="savings">Poupança</option>
                <option value="wallet">Carteira (Dinheiro)</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currentBalance">{accountToEdit ? 'Saldo Atual' : 'Saldo Atual Inicial'}</Label>
              <CurrencyInput id="currentBalance" name="currentBalance" required value={accountToEdit ? Number(accountToEdit.currentBalance) : undefined} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar Conta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
