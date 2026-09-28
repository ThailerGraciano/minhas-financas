"use client";

import { TransactionFormDialog } from "@/components/transaction-form-dialog";
import {
  Archive,
  ArrowDownLeft,
  ArrowLeftRight,
  Barcode,
  Coffee,
  Eye,
  EyeOff,
  Landmark,
  MoreHorizontal,
  PiggyBank,
  Utensils,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type BalanceSummary = {
  type: string;
  label: string;
  total: number;
};

export function AccountBalancesSummary({
  totalBalance,
  balancesByType,
  showBalance: controlledShowBalance,
  onToggleShowBalance,
}: {
  totalBalance: number;
  balancesByType?: BalanceSummary[];
  showBalance?: boolean;
  onToggleShowBalance?: () => void;
}) {
  const [internalShowBalance, setInternalShowBalance] = useState(true);
  const showBalance = controlledShowBalance !== undefined ? controlledShowBalance : internalShowBalance;

  const handleToggle = () => {
    if (onToggleShowBalance) {
      onToggleShowBalance();
    } else {
      setInternalShowBalance(!internalShowBalance);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "savings":
        return <PiggyBank className="w-3.5 h-3.5 text-blue-400" />;
      case "wallet":
        return <Wallet className="w-3.5 h-3.5 text-emerald-400" />;
      case "stash":
        return <Archive className="w-3.5 h-3.5 text-amber-400" />;
      case "food":
        return <Utensils className="w-3.5 h-3.5 text-orange-400" />;
      case "meal":
        return <Coffee className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Landmark className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="bg-card rounded-[2rem] border border-white/5 shadow-sm flex flex-col justify-between p-5 sm:p-6 relative overflow-hidden h-full">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Saldo Total Geral Header & Valor */}
      <div className="flex flex-col space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span>Saldo Total Geral</span>
            <button
              type="button"
              onClick={handleToggle}
              className="p-1 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={showBalance ? "Ocultar saldo" : "Mostrar saldo"}
              aria-label={showBalance ? "Ocultar saldo" : "Mostrar saldo"}
            >
              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold tracking-wide border border-emerald-500/20">
            Contas Ativas
          </div>
        </div>

        <div className="text-3xl sm:text-4xl lg:text-3xl xl:text-4xl font-black text-foreground tracking-tight whitespace-nowrap min-w-0">
          {showBalance ? (
            <>
              <span className="text-primary text-xl sm:text-2xl lg:text-xl xl:text-2xl mr-1.5 font-bold tracking-normal">
                R$
              </span>
              <span className="tabular-nums">{formatCurrency(totalBalance)}</span>
            </>
          ) : (
            <span className="tracking-widest">••••••</span>
          )}
        </div>
      </div>

      {/* Distribuição por Tipo de Conta */}
      {balancesByType && balancesByType.length > 0 && (
        <div className="border-t border-white/5 pt-3.5 my-3 relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Distribuição por Tipo</span>
            <span className="text-[10px] text-muted-foreground">{balancesByType.length} tipos de conta</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {balancesByType.slice(0, 4).map((b) => (
              <div
                key={b.type}
                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-center min-w-0"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {getAccountTypeIcon(b.type)}
                  <span className="text-[11px] font-medium text-muted-foreground truncate">{b.label}</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground mt-1 tabular-nums whitespace-nowrap">
                  {showBalance ? `R$ ${formatCurrency(b.total)}` : "••••••"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions Grid (Thumb Zone) */}
      <div className="grid grid-cols-4 gap-2 mt-auto pt-4 border-t border-white/5 relative z-10">
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
