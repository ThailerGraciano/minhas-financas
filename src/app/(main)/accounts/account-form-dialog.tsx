'use client';

import { useState } from 'react';
import { createAccount, updateAccount } from '@/app/actions/accounts';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

type Account = {
  id: number;
  name: string;
  type: string;
  currentBalance: string;
};

export function AccountFormDialog({ 
  accountToEdit, 
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger
}: { 
  accountToEdit?: Account, 
  trigger?: React.ReactNode,
  open?: boolean,
  onOpenChange?: (open: boolean) => void,
  hideTrigger?: boolean
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  
  const handleOpenChange = (value: boolean) => {
    if (isControlled && controlledOnOpenChange) {
      controlledOnOpenChange(value);
    } else {
      setUncontrolledOpen(value);
    }
  };

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState<number>(accountToEdit ? Number(accountToEdit.currentBalance) : 0);

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
      handleOpenChange(false);
    } else {
      setError(result.error || `Erro ao ${accountToEdit ? 'atualizar' : 'criar'} conta`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {trigger || <Button className="cursor-pointer"><Plus className="w-4 h-4 mr-2 md:mr-2 pointer-events-none" /><span className="hidden md:inline pointer-events-none">Nova Conta</span><span className="md:hidden pointer-events-none">Conta</span></Button>}
        </DialogTrigger>
      )}
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
              <Select name="type" defaultValue={accountToEdit?.type || 'checking'} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Conta Corrente</SelectItem>
                  <SelectItem value="savings">Poupança</SelectItem>
                  <SelectItem value="wallet">Carteira (Dinheiro)</SelectItem>
                  <SelectItem value="stash">Caixinha</SelectItem>
                  <SelectItem value="food">Alimentação</SelectItem>
                  <SelectItem value="meal">Refeição</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currentBalance">{accountToEdit ? 'Saldo Atual' : 'Saldo Atual Inicial'}</Label>
              <CurrencyInput id="currentBalance" name="currentBalance" required value={balance} onValueChange={setBalance} />
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
