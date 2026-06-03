'use client';

import { useState } from 'react';
import { createCreditCard } from '@/app/actions/credit-cards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

export function CreditCardFormDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const creditLimit = formData.get('creditLimit') as string;
    const closingDay = Number(formData.get('closingDay'));
    const dueDay = Number(formData.get('dueDay'));

    const result = await createCreditCard({
      name,
      creditLimit,
      closingDay,
      dueDay,
    });
    
    setIsPending(false);

    if (result.success) {
      setOpen(false);
    } else {
      setError(result.error || 'Erro ao cadastrar cartão');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2 md:mr-2" /><span className="hidden md:inline">Novo Cartão</span><span className="md:hidden">Cartão</span></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Novo Cartão de Crédito</DialogTitle>
            <DialogDescription>
              Cadastre as informações do seu cartão para controle de faturas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Cartão</Label>
              <Input id="name" name="name" required placeholder="Ex: Nubank, Visa Infinite..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="creditLimit">Limite Total</Label>
              <Input id="creditLimit" name="creditLimit" type="number" step="0.01" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="closingDay">Dia de Fechamento</Label>
                <Input id="closingDay" name="closingDay" type="number" min="1" max="31" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDay">Dia de Vencimento</Label>
                <Input id="dueDay" name="dueDay" type="number" min="1" max="31" required />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar Cartão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
