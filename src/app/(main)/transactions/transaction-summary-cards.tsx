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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 mb-6">
      {/* 1. Receitas */}
      <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Receitas
          </span>
          <ArrowUp className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-emerald-500">
            {formatCurrency(totalIncome)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {incomeCount} {incomeCount === 1 ? "recebimento" : "recebimentos"}
          </div>
        </div>
      </div>

      {/* 2. Despesas */}
      <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Despesas
          </span>
          <ArrowDown className="w-4 h-4 text-rose-500" />
        </div>
        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-rose-500">
            {formatCurrency(totalExpense)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {expenseCount} {expenseCount === 1 ? "despesa" : "despesas"}
          </div>
        </div>
      </div>

      {/* 3. Saldo Líquido */}
      <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Saldo Líquido
          </span>
          <Scale className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
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

