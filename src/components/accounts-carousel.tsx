"use client";

import { Archive, Landmark, PiggyBank, Wallet } from "lucide-react";

type Account = {
  id: string;
  name: string;
  currentBalance: string | number;
  type?: string;
};

export function AccountsCarousel({ accounts }: { accounts: Account[] }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case "savings":
        return <PiggyBank className="w-5 h-5 text-blue-500" />;
      case "wallet":
        return <Wallet className="w-5 h-5 text-green-500" />;
      case "stash":
        return <Archive className="w-5 h-5 text-amber-500" />;
      default:
        return <Landmark className="w-5 h-5 text-purple-500" />;
    }
  };

  if (accounts.length === 0) {
    return null;
  }

  return (
    <div className="w-full relative">
      <div className="flex overflow-x-auto flex-nowrap gap-4 pb-4 -mx-2 px-2 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex-shrink-0 w-[200px] bg-card rounded-[1.5rem] p-4 flex flex-col space-y-3 shadow-sm border border-white/5"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                {getIcon(acc.type)}
              </div>
              <div className="text-[10px] font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider">
                100% CDI
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground truncate">{acc.name}</span>
              <span className="text-lg font-bold text-foreground">
                <span className="text-xs text-muted-foreground mr-1">R$</span>
                {formatCurrency(Number(acc.currentBalance))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
