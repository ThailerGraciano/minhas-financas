"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Archive,
  Coffee,
  Landmark,
  List,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  SlidersHorizontal,
  Utensils,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AccountFormDialog } from "./account-form-dialog";
import { AdjustBalanceDialog } from "./adjust-balance-dialog";

export type Account = {
  id: number;
  name: string;
  type: string;
  currentBalance: string;
  targetAmount?: string | null;
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "savings":
      return <PiggyBank className="w-5 h-5 text-blue-400" />;
    case "wallet":
      return <Wallet className="w-5 h-5 text-emerald-400" />;
    case "stash":
      return <Archive className="w-5 h-5 text-amber-400" />;
    case "food":
      return <Utensils className="w-5 h-5 text-orange-400" />;
    case "meal":
      return <Coffee className="w-5 h-5 text-red-400" />;
    default:
      return <Landmark className="w-5 h-5 text-purple-400" />;
  }
};

const getSubtitle = (account: Account) => {
  switch (account.type) {
    case "checking":
      return "Conta Corrente • Movimentação";
    case "savings":
      return "Poupança • Reserva";
    case "stash":
      return "Caixinha • Metas";
    case "food":
      return "Vale Alimentação • Benefício";
    case "meal":
      return "Vale Refeição • Benefício";
    case "wallet":
      return "Carteira • Dinheiro físico";
    default:
      return "Conta Bancária";
  }
};

const getBalanceLabel = (type: string) => {
  switch (type) {
    case "checking":
      return "Saldo disponível";
    case "savings":
      return "Acumulado";
    case "stash":
      return "Acumulado";
    case "food":
    case "meal":
      return "Saldo do vale";
    case "wallet":
      return "Saldo disponível";
    default:
      return "Saldo disponível";
  }
};

const getGoalData = (account: Account) => {
  const targetNum = Number(account.targetAmount);
  if (!account.targetAmount || isNaN(targetNum) || targetNum <= 0) {
    return null;
  }

  const balanceNum = Number(account.currentBalance || 0);
  const percent = Math.round((balanceNum / targetNum) * 100);
  const displayPercent = Math.max(0, percent);
  const clampedVisualPercent = Math.min(100, displayPercent);
  const isReached = percent >= 100;

  return {
    targetNum,
    balanceNum,
    percent,
    displayPercent,
    clampedVisualPercent,
    isReached,
  };
};

const renderBadge = (account: Account, goalData: ReturnType<typeof getGoalData>) => {
  if (goalData) {
    if (goalData.isReached) {
      return (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
          {goalData.percent}% da Meta
        </span>
      );
    }
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 whitespace-nowrap">
        {goalData.displayPercent}% da Meta
      </span>
    );
  }

  const balance = Number(account.currentBalance || 0);

  if (balance === 0) {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 whitespace-nowrap">
        Zerado
      </span>
    );
  }

  if (account.type === "checking") {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10 whitespace-nowrap">
        Principal
      </span>
    );
  }

  if (account.type === "savings") {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
        100% CDI
      </span>
    );
  }

  if (account.type === "stash") {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
        Caixinha
      </span>
    );
  }

  if (account.type === "food" || account.type === "meal") {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 whitespace-nowrap">
        Benefício
      </span>
    );
  }

  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
      Dinheiro
    </span>
  );
};

function AccountCard({ account, showBalance = true }: { account: Account; showBalance?: boolean }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const balanceNum = Number(account.currentBalance || 0);
  const isNegative = balanceNum < 0;
  const absValue = Math.abs(balanceNum);
  const rawFormatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);
  const displaySymbol = isNegative ? "-R$" : "R$";

  const goalData = getGoalData(account);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  return (
    <Card className="bg-card border border-white/5 rounded-2xl p-4 flex flex-col gap-3 relative transition-all hover:border-white/10 group shadow-sm">
      {/* Background link to make the whole card clickable except the actions */}
      <Link
        href={`/transactions?accountId=${account.id}`}
        className="absolute inset-0 z-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-2xl"
        aria-label={`Ver extrato de ${account.name}`}
      />

      <div className="relative z-10 flex flex-col gap-3">
        {/* Linha 1 (Cabeçalho do Card) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 pointer-events-none">
              {getTypeIcon(account.type)}
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-bold text-lg text-foreground truncate max-w-[140px] sm:max-w-[180px]">
                {account.name}
              </span>
              {renderBadge(account, goalData)}
            </div>
          </div>

          <div className="pointer-events-auto shrink-0">
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
                  <Link
                    href={`/transactions?accountId=${account.id}`}
                    className="cursor-pointer flex items-center w-full"
                  >
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

        {/* Linha 2 (Subtítulo) */}
        <div className="text-xs text-muted-foreground pointer-events-none">{getSubtitle(account)}</div>

        {/* Linha Intermediária (Progresso de Meta) */}
        {goalData && (
          <div className="space-y-1.5 pt-1 pointer-events-none">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Meta: R$ {formatCurrency(goalData.targetNum)}</span>
              <span className={goalData.isReached ? "text-emerald-400 font-semibold" : "text-amber-500 font-semibold"}>
                {goalData.displayPercent}%
              </span>
            </div>
            <Progress
              value={goalData.clampedVisualPercent}
              className={`h-1.5 bg-secondary ${
                goalData.isReached
                  ? "[&>[data-slot=progress-indicator]]:bg-emerald-500"
                  : "[&>[data-slot=progress-indicator]]:bg-amber-500"
              }`}
            />
          </div>
        )}

        {/* Linha 3 (Rodapé do Card) */}
        <div className="flex justify-between items-end mt-2 pt-2 border-t border-white/5 pointer-events-none">
          <span className="text-sm text-muted-foreground">{getBalanceLabel(account.type)}</span>
          <div className="text-xl font-bold text-foreground truncate">
            {showBalance ? (
              <>
                <span className="text-sm text-muted-foreground mr-1">{displaySymbol}</span>
                {rawFormatted}
              </>
            ) : (
              <span className="tracking-widest text-base">••••••</span>
            )}
          </div>
        </div>
      </div>

      <AccountFormDialog accountToEdit={account} open={isEditOpen} onOpenChange={setIsEditOpen} hideTrigger />

      <AdjustBalanceDialog account={account} open={isAdjustOpen} onOpenChange={setIsAdjustOpen} hideTrigger />
    </Card>
  );
}

export function AccountList({ accounts, showBalance = true }: { accounts: Account[]; showBalance?: boolean }) {
  if (accounts.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground border rounded-2xl border-dashed border-white/10 mt-2">
        Nenhuma conta encontrada nesta categoria.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} showBalance={showBalance} />
      ))}
    </div>
  );
}
