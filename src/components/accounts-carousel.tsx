"use client";

import { Archive, Landmark, PiggyBank, Wallet } from "lucide-react";

export type AccountCarouselItem = {
  id: string | number;
  name: string;
  currentBalance: string | number;
  type?: string | null;
};

export function AccountsCarousel({
  accounts,
  showBalance = true,
}: {
  accounts: AccountCarouselItem[];
  showBalance?: boolean;
}) {
  const formatCurrency = (value: number) => {
    if (!showBalance) return "••••••";
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const getIcon = (type?: string | null) => {
    switch (type) {
      case "savings":
        return <PiggyBank className="w-5 h-5 text-blue-500" />;
      case "wallet":
        return <Wallet className="w-5 h-5 text-emerald-500" />;
      case "stash":
        return <Archive className="w-5 h-5 text-amber-500" />;
      default:
        return <Landmark className="w-5 h-5 text-primary" />;
    }
  };

  if (accounts.length === 0) {
    return null;
  }

  return (
    <div className="w-full relative">
      <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex-shrink-0 w-[200px] bg-card rounded-2xl sm:rounded-[1.5rem] p-4 flex flex-col space-y-3 shadow-sm border border-white/5 hover:border-white/10 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center border border-white/5">
                {getIcon(acc.type)}
              </div>
              <div className="text-[10px] font-bold text-muted-foreground bg-white/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/5">
                {acc.type === "checking" ? "Corrente" : acc.type === "savings" ? "Poupança" : "Conta"}
              </div>
            </div>

            <div className="flex flex-col pt-1">
              <span className="text-xs font-medium text-muted-foreground truncate">{acc.name}</span>
              <span className="text-lg font-bold text-foreground tracking-tight">
                {showBalance && <span className="text-primary text-xs mr-1 font-semibold">R$</span>}
                {formatCurrency(Number(acc.currentBalance))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
