'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, PiggyBank, Landmark, Pencil } from 'lucide-react';
import { AccountFormDialog } from './account-form-dialog';
import { Button } from '@/components/ui/button';

type Account = {
  id: number;
  name: string;
  type: string;
  currentBalance: string;
};

export function AccountList({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
        Nenhuma conta cadastrada ainda.
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'savings': return <PiggyBank className="w-5 h-5 text-blue-500" />;
      case 'wallet': return <Wallet className="w-5 h-5 text-green-500" />;
      default: return <Landmark className="w-5 h-5 text-purple-500" />;
    }
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
      {accounts.map((account) => (
        <Card key={account.id} className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              {getTypeIcon(account.type)}
              <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
            </div>
            <AccountFormDialog 
              accountToEdit={account} 
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </Button>
              } 
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account.currentBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              {account.type === 'checking' ? 'Conta Corrente' : account.type === 'savings' ? 'Poupança' : 'Carteira'}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
