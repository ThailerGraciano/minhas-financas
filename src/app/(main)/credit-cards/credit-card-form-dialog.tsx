'use client';

import { useState } from 'react';
import { createCreditCard, updateCreditCard } from '@/app/actions/credit-cards';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';

type CreditCardType = {
  id: number;
  name: string;
  creditLimit: string;
  closingDay: number;
  dueDay: number;
};

interface Props {
  initialData?: CreditCardType;
  children?: React.ReactNode;
}

export function CreditCardFormDialog({ initialData, children }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!initialData;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const creditLimit = formData.get('creditLimit') as string;
    const closingDay = Number(formData.get('closingDay'));
    const dueDay = Number(formData.get('dueDay'));

    const data = {
      name,
      creditLimit,
      closingDay,
      dueDay,
    };

    let result;
    if (isEditing) {
      result = await updateCreditCard(initialData.id, data);
    } else {
      result = await createCreditCard(data);
    }
    
    setIsPending(false);

    if (result.success) {
      setOpen(false);
    } else {
      setError(result.error || `Erro ao ${isEditing ? 'atualizar' : 'cadastrar'} cartão`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button><Plus className="w-4 h-4 mr-2 md:mr-2" /><span className="hidden md:inline">Novo Cartão</span><span className="md:hidden">Cartão</span></Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Cartão' : 'Novo Cartão de Crédito'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Altere as informações do seu cartão.' : 'Cadastre as informações do seu cartão para controle de faturas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Cartão</Label>
              <Input id="name" name="name" defaultValue={initialData?.name} required placeholder="Ex: Nubank, Visa Infinite..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="creditLimit">Limite Total</Label>
              <CurrencyInput id="creditLimit" name="creditLimit" defaultValue={initialData?.creditLimit} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="closingDay">Dia de Fechamento</Label>
                <Input id="closingDay" name="closingDay" defaultValue={initialData?.closingDay} type="number" min="1" max="31" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDay">Dia de Vencimento</Label>
                <Input id="dueDay" name="dueDay" defaultValue={initialData?.dueDay} type="number" min="1" max="31" required />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" isLoading={isPending} disabled={isPending}>
              
              {isPending ? 'Salvando...' : 'Salvar Cartão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
