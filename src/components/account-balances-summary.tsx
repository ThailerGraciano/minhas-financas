"use client";

import { TransactionFormDialog } from "@/components/transaction-form-dialog";
import { ArrowDownLeft, ArrowLeftRight, Barcode, Eye, EyeOff, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function AccountBalancesSummary({ totalBalance }: { totalBalance: number }) {
  const [showBalance, setShowBalance] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  return (
    <div className="bg-card rounded-[2rem] border-transparent shadow-sm flex flex-col p-5 sm:p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Saldo Total Geral Header & Valor */}
      <div className="flex flex-col space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span>Saldo Total Geral</span>
            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              className="p-1 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={showBalance ? "Ocultar saldo" : "Mostrar saldo"}
              aria-label={showBalance ? "Ocultar saldo" : "Mostrar saldo"}
            >
              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold tracking-wide border border-emerald-500/20">
            +12.4% este mês
          </div>
        </div>

        <div className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground tracking-tight">
          {showBalance ? (
            <>
              <span className="text-primary text-2xl sm:text-3xl md:text-4xl mr-2 font-bold tracking-normal">R$</span>
              {formatCurrency(totalBalance)}
            </>
          ) : (
            <span className="tracking-widest">••••••</span>
          )}
        </div>
      </div>

      {/* Quick Actions Grid (Thumb Zone) */}
      <div className="grid grid-cols-4 gap-2 mt-6 pt-4 border-t border-white/5 relative z-10">
        {/* Transferir */}
        <TransactionFormDialog
          initialTab="transfer"
          trigger={
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-1.5 p-2.5 sm:p-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-muted-foreground hover:text-foreground cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Transferir</span>
            </button>
          }
        />

        {/* Depositar */}
        <TransactionFormDialog
          initialTab="income"
          trigger={
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-1.5 p-2.5 sm:p-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-muted-foreground hover:text-foreground cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Depositar</span>
            </button>
          }
        />

        {/* Pagar */}
        <TransactionFormDialog
          initialTab="expense"
          trigger={
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-1.5 p-2.5 sm:p-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-muted-foreground hover:text-foreground cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Barcode className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Pagar</span>
            </button>
          }
        />

        {/* Mais */}
        <Link
          href="/power-grid"
          className="flex flex-col items-center justify-center gap-1.5 p-2.5 sm:p-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-muted-foreground hover:text-foreground cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 text-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium">Mais</span>
        </Link>
      </div>
    </div>
  );
}
