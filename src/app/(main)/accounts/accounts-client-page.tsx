"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { AccountFormDialog } from "./account-form-dialog";
import { AccountList, type Account } from "./account-list";

export function AccountsClientPage({ initialAccounts }: { initialAccounts: Account[] }) {
  const [showBalance, setShowBalance] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");

  const totalBalance = useMemo(() => {
    return initialAccounts.reduce((acc, curr) => acc + Number(curr.currentBalance || 0), 0);
  }, [initialAccounts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const othersCount = useMemo(() => {
    return initialAccounts.filter((a) => a.type !== "checking" && a.type !== "savings" && a.type !== "stash").length;
  }, [initialAccounts]);

  const filterOptions = useMemo(() => {
    const opts = [
      { id: "all", label: `Todas (${initialAccounts.length})` },
      { id: "checking_savings", label: "Corrente & Poupança" },
      { id: "stash", label: "Caixinhas & Metas" },
    ];
    if (othersCount > 0) {
      opts.push({ id: "others", label: `Outros (${othersCount})` });
    }
    return opts;
  }, [initialAccounts.length, othersCount]);

  const filteredAccounts = useMemo(() => {
    if (selectedFilter === "checking_savings") {
      return initialAccounts.filter((a) => a.type === "checking" || a.type === "savings");
    }
    if (selectedFilter === "stash") {
      return initialAccounts.filter((a) => a.type === "stash" || Boolean(a.targetAmount && Number(a.targetAmount) > 0));
    }
    if (selectedFilter === "others") {
      return initialAccounts.filter((a) => a.type !== "checking" && a.type !== "savings" && a.type !== "stash");
    }
    return initialAccounts;
  }, [initialAccounts, selectedFilter]);

  return (
    <div className="flex flex-col space-y-6">
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Contas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão unificada das suas contas e reservas</p>
        </div>
        <AccountFormDialog
          trigger={
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all cursor-pointer">
              + Nova Conta
            </Button>
          }
        />
      </div>

      {/* 2. Card de Saldo Consolidado */}
      <Card className="bg-card/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
        {/* Top specular reflection shimmer */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        {/* Background Glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Topo do card */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span>Saldo Total Consolidado</span>
            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer"
              aria-label={showBalance ? "Ocultar saldos" : "Mostrar saldos"}
            >
              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold tracking-wide border border-emerald-500/20">
            <span>↗</span>
            <span>+2.4% no mês</span>
          </div>
        </div>

        {/* Centro do card */}
        <div className="my-4 relative z-10">
          <div className="text-4xl font-bold text-white tracking-tight">
            {showBalance ? (
              <>
                <span className="text-primary mr-1.5 font-bold">R$</span>
                {formatCurrency(totalBalance)}
              </>
            ) : (
              <span className="tracking-widest">••••••</span>
            )}
          </div>
        </div>

        {/* Rodapé do card */}
        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs relative z-10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {initialAccounts.length} {initialAccounts.length === 1 ? "conta integrada" : "contas integradas"}
            </span>
          </div>
          <button
            type="button"
            className="text-primary hover:text-primary/80 transition-colors font-medium hover:underline cursor-pointer bg-transparent border-0 p-0 text-xs"
          >
            Ajustar ordem &gt;
          </button>
        </div>
      </Card>

      {/* 3. Barra de Filtros Horizontais */}
      <div className="flex overflow-x-auto gap-2.5 py-2 scrollbar-hide no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {filterOptions.map((option) => {
          const isActive = selectedFilter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedFilter(option.id)}
              className={`relative rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer backdrop-blur-xl select-none overflow-hidden ${
                isActive
                  ? "bg-primary text-white border border-primary/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.40),0_4px_20px_rgba(130,10,209,0.40)]"
                  : "bg-card/75 border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-card/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              }`}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              {option.label}
            </button>
          );
        })}
      </div>

      {/* 4. Listagem de Contas */}
      <AccountList accounts={filteredAccounts} showBalance={showBalance} />
    </div>
  );
}
