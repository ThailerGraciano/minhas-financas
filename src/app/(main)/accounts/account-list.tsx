'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Wallet, PiggyBank, Landmark, Archive, MoreHorizontal, Pencil, SlidersHorizontal, Utensils, Coffee, List } from 'lucide-react';
import Link from 'next/link';
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

  const isNegative = Number(account.currentBalance) < 0;
  const absValue = Math.abs(Number(account.currentBalance));
  const rawFormatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(absValue);
  const displaySymbol = isNegative ? '-R$' : 'R$';

  return (
    <Card className="relative overflow-hidden transition-colors hover:border-primary/50 group flex flex-col justify-between p-6">
      {/* Background link to make the whole card clickable except the actions */}
      <Link 
        href={`/transactions?accountId=${account.id}`} 
        className="absolute inset-0 z-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset" 
        aria-label={`Ver extrato de ${account.name}`} 
      />
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Cabeçalho do Card */}
        <div className="flex items-center justify-between">
          <div className="rounded-lg w-10 h-10 flex items-center justify-center bg-white/5 pointer-events-none">
            {getTypeIcon(account.type)}
          </div>

          <div className="pointer-events-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label={`Ações para ${account.name}`}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/transactions?accountId=${account.id}`} className="cursor-pointer flex items-center w-full">
                    <List className="mr-2 h-4 w-4" />
                    Ver Extrato
                  </Link>
                </DropdownMenuItem>

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
          </div>
        </div>

        {/* Corpo do Card */}
        <div className="mt-4 pointer-events-none flex-grow">
          <h3 className="font-semibold text-lg">{account.name}</h3>
          <p className="text-sm text-muted-foreground">{getTypeName(account.type)}</p>
        </div>

        {/* Rodapé do Card */}
        <div className="mt-4 pointer-events-none">
          <div className="text-3xl font-bold truncate" title={`${displaySymbol} ${rawFormatted}`}>
            <span className="text-xl text-muted-foreground mr-1">{displaySymbol}</span>
            {rawFormatted}
          </div>
        </div>
      </div>

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
    </Card>
  );
}

export function AccountList({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground border rounded-[20px] border-dashed border-white/10 mt-6">
        Nenhuma conta cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  );
}

