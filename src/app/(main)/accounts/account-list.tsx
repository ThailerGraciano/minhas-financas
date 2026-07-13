'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, PiggyBank, Landmark, Archive, MoreVertical, Pencil, SlidersHorizontal, Utensils, Coffee } from 'lucide-react';
import { AccountFormDialog } from './account-form-dialog';
import { AdjustBalanceDialog } from './adjust-balance-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Account = {
  id: number;
  name: string;
  type: string;
  currentBalance: string;
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'savings': return <PiggyBank className="w-5 h-5 text-blue-500" />;
    case 'wallet': return <Wallet className="w-5 h-5 text-green-500" />;
    case 'stash': return <Archive className="w-5 h-5 text-amber-500" />;
    case 'food': return <Utensils className="w-5 h-5 text-orange-500" />;
    case 'meal': return <Coffee className="w-5 h-5 text-red-500" />;
    default: return <Landmark className="w-5 h-5 text-purple-500" />;
  }
};

const formatCurrency = (value: string) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
};

const getTypeName = (type: string) => {
  switch (type) {
    case 'checking': return 'Conta Corrente';
    case 'savings': return 'Poupança';
    case 'stash': return 'Caixinha';
    case 'food': return 'Alimentação';
    case 'meal': return 'Refeição';
    default: return 'Carteira';
  }
};

function AccountCard({ account }: { account: Account }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {getTypeIcon(account.type)}
          <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={`Ações para ${account.name}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setIsEditOpen(true);
              }}
              className="cursor-pointer"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar Conta
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setIsAdjustOpen(true);
              }}
              className="cursor-pointer"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Reajustar Saldo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AccountFormDialog
          accountToEdit={account}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          hideTrigger
        />

        <AdjustBalanceDialog
          account={account}
          open={isAdjustOpen}
          onOpenChange={setIsAdjustOpen}
          hideTrigger
        />
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(account.currentBalance)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {getTypeName(account.type)}
        </p>
      </CardContent>
    </Card>
  );
}

export function AccountList({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
        Nenhuma conta cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  );
}
