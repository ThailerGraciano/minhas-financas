'use client';

import { useState, useEffect } from 'react';
import { createTransaction } from '@/app/actions/transactions';
import { getTransactionFormData } from '@/app/actions/form-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function TransactionFormDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  
  const [tab, setTab] = useState('expense');
  const [expenseType, setExpenseType] = useState('single'); 
  const [paymentMethod, setPaymentMethod] = useState('account');
  const router = useRouter();

  useEffect(() => {
    if (open && !formData) {
      getTransactionFormData().then(setFormData);
    }
  }, [open, formData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const form = new FormData(e.currentTarget);
    const description = form.get('description') as string;
    const amount = form.get('amount') as string;
    const date = form.get('date') as string;
    const categoryId = Number(form.get('categoryId'));
    
    // Extrai YYYY-MM
    const competencyMonth = date.substring(0, 7);

    let baseData: any = {
      description,
      amount,
      date,
      competencyMonth,
      categoryId,
      status: 'pending', 
    };

    if (tab === 'expense') {
      const isCreditCard = paymentMethod === 'credit_card';
      baseData.type = isCreditCard ? 'credit_card_expense' : 'expense';
      
      if (isCreditCard) {
        baseData.creditCardId = Number(form.get('creditCardId'));
      } else {
        baseData.accountId = Number(form.get('accountId'));
      }

      baseData.isFixed = expenseType === 'fixed';
      
      if (expenseType === 'installment') {
        baseData.installmentTotal = Number(form.get('installmentTotal'));
      }
    } else if (tab === 'income') {
      baseData.type = 'income';
      baseData.accountId = Number(form.get('accountIdIncome'));
    } else if (tab === 'transfer') {
      baseData.type = 'transfer';
      baseData.accountId = Number(form.get('accountIdTransferOrigin'));
      // Transferências reais precisam de lógica dupla, mas manteremos simples por enquanto
    }

    const res = await createTransaction(baseData);
    
    setIsPending(false);
    if (res.success) {
      setOpen(false);
      router.refresh();
    } else {
      alert("Erro ao salvar a transação.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="fixed bottom-20 md:bottom-8 right-4 md:right-8 rounded-full h-14 w-14 shadow-lg p-0 bg-primary hover:bg-primary/90 transition-transform hover:scale-105 z-50">
          <Plus className="h-6 w-6 text-white" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
        </DialogHeader>
        
        {formData ? (
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="expense">Despesa</TabsTrigger>
              <TabsTrigger value="income">Receita</TabsTrigger>
              <TabsTrigger value="transfer">Transferência</TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Input id="description" name="description" required placeholder="Ex: Mercado, Salário..." />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Valor</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" required placeholder="0,00" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Data</Label>
                  <Input id="date" name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="categoryId">Categoria</Label>
                <select name="categoryId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  {formData.categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <TabsContent value="expense" className="space-y-4">
                 <div className="grid gap-2">
                    <Label>Tipo de Despesa</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" checked={expenseType === 'single'} onChange={() => setExpenseType('single')} className="accent-primary" /> Única
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" checked={expenseType === 'fixed'} onChange={() => setExpenseType('fixed')} className="accent-primary" /> Fixa
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" checked={expenseType === 'installment'} onChange={() => setExpenseType('installment')} className="accent-primary" /> Parcelada
                      </label>
                    </div>
                 </div>

                 {expenseType === 'installment' && (
                    <div className="grid gap-2">
                      <Label htmlFor="installmentTotal">Quantidade de Parcelas</Label>
                      <Input id="installmentTotal" name="installmentTotal" type="number" min="2" defaultValue="2" required />
                    </div>
                 )}

                 <div className="grid gap-2">
                    <Label>Método de Pagamento</Label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="account">Conta</option>
                      <option value="credit_card">Cartão de Crédito</option>
                    </select>
                 </div>

                 {paymentMethod === 'account' && (
                   <div className="grid gap-2">
                      <Label htmlFor="accountId">Conta</Label>
                      <select name="accountId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                        {formData.accounts.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                   </div>
                 )}

                 {paymentMethod === 'credit_card' && (
                   <div className="grid gap-2">
                      <Label htmlFor="creditCardId">Cartão de Crédito</Label>
                      <select name="creditCardId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                        {formData.creditCards.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                   </div>
                 )}
              </TabsContent>
              
              <TabsContent value="income" className="space-y-4">
                 <div className="grid gap-2">
                    <Label htmlFor="accountIdIncome">Depositar na Conta</Label>
                    <select name="accountIdIncome" id="accountIdIncome" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                      {formData.accounts.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                 </div>
              </TabsContent>

              <TabsContent value="transfer" className="space-y-4">
                 <div className="grid gap-2">
                    <Label htmlFor="accountIdTransferOrigin">Conta de Origem</Label>
                    <select name="accountIdTransferOrigin" id="accountIdTransferOrigin" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                      {formData.accounts.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                 </div>
                 <div className="grid gap-2">
                    <Label htmlFor="accountIdTransferDest">Conta de Destino</Label>
                    <select name="accountIdTransferDest" id="accountIdTransferDest" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                      {formData.accounts.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                 </div>
              </TabsContent>

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                  {isPending ? 'Salvando...' : 'Salvar Transação'}
                </Button>
              </div>
            </form>
          </Tabs>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            Carregando formulário...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
