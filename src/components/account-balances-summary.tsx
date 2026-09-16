"use client";

import { CreditCard, Eye, EyeOff, HandCoins, MoreHorizontal, Send } from "lucide-react";
import { useState } from "react";

export function AccountBalancesSummary({ totalBalance }: { totalBalance: number }) {
  const [showBalance, setShowBalance] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  return (
    <div className="bg-card rounded-[2rem] border-transparent shadow-sm flex flex-col p-6 space-y-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Saldo Total Geral */}
      <div className="flex flex-col space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            Saldo Total Geral
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="text-muted-foreground hover:text-foreground transition-colors ml-1"
            >
              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold tracking-wide">
            +12.4%
          </div>
        </div>

        <div className="text-5xl md:text-6xl font-black text-foreground tracking-tighter">
          {showBalance ? (
            <>
              <span className="text-muted-foreground text-3xl md:text-4xl mr-2 font-bold tracking-normal">R$</span>
              {formatCurrency(totalBalance)}
            </>
          ) : (
            <span className="tracking-widest">••••••</span>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 relative z-10">
        <button className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl hover:bg-white/5 transition-colors group">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <Send className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Transferir
          </span>
        </button>

        <button className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl hover:bg-white/5 transition-colors group">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <HandCoins className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Depositar
          </span>
        </button>

        <button className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl hover:bg-white/5 transition-colors group">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Pagar
          </span>
        </button>

        <button className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl hover:bg-white/5 transition-colors group">
          <div className="w-12 h-12 rounded-full bg-white/5 text-muted-foreground flex items-center justify-center group-hover:scale-105 transition-transform">
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Mais
          </span>
        </button>
      </div>
    </div>
  );
}
