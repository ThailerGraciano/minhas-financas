"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp, Scale } from "lucide-react";
import { TransactionWithRelations } from "./transaction-list";

interface TransactionSummaryCardsProps {
  transactions: TransactionWithRelations[];
  accountId?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

export function TransactionSummaryCards({ transactions, accountId }: TransactionSummaryCardsProps) {
  const { totalIncome, incomeCount, totalExpense, expenseCount, netBalance } = useMemo(() => {
    let incomeSum = 0;
    let inCount = 0;
    let expenseSum = 0;
    let expCount = 0;
    let pendingSum = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount) || 0;

      if (accountId) {
        // Quando uma conta específica está selecionada
        const isIncoming = tx.type === "income" || (tx.type === "transfer" && tx.parentTransactionId !== null);
        const isOutgoing =
          tx.type === "expense" ||
          tx.type === "credit_card_expense" ||
          (tx.type === "transfer" && tx.parentTransactionId === null);

        if (isIncoming) {
          incomeSum += amount;
          inCount++;
        } else if (isOutgoing) {
          expenseSum += amount;
          expCount++;
          if (tx.status === "pending" || tx.status === "partial") {
            pendingSum += amount;
          }
        }
      } else {
        // Visão global (Todas as contas): transferências internas não inflam receitas/despesas
        if (tx.type === "income") {
          incomeSum += amount;
          inCount++;
        } else if (tx.type === "expense" || tx.type === "credit_card_expense") {
          expenseSum += amount;
          expCount++;
          if (tx.status === "pending" || tx.status === "partial") {
            pendingSum += amount;
          }
        }
      }
    }

    return {
      totalIncome: incomeSum,
      incomeCount: inCount,
      totalExpense: expenseSum,
      expenseCount: expCount,
      netBalance: incomeSum - expenseSum,
      totalPending: pendingSum,
    };
  }, [transactions, accountId]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-4 mb-6">
      {/* 1. Receitas - Apple Liquid Glass */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Receitas
          </span>
          <div className="size-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-emerald-400 tabular-nums">
            {formatCurrency(totalIncome)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {incomeCount} {incomeCount === 1 ? "recebimento" : "recebimentos"}
          </div>
        </div>
      </div>

      {/* 2. Despesas - Apple Liquid Glass */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Despesas
          </span>
          <div className="size-7 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
        </div>
        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-rose-400 tabular-nums">
            {formatCurrency(totalExpense)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {expenseCount} {expenseCount === 1 ? "despesa" : "despesas"}
          </div>
        </div>
      </div>

      {/* 3. Saldo Líquido - Apple Liquid Glass */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Saldo Líquido
          </span>
          <div className="size-7 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
            <Scale className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {formatCurrency(netBalance)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {netBalance >= 0 ? "Superávit no período" : "Déficit no período"}
          </div>
        </div>
      </div>
    </div>
  );
}

