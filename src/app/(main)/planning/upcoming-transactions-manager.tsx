"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CreditCard, Landmark, WalletCards } from "lucide-react";
import { useState } from "react";

export interface Transaction {
  id: number | string;
  type: string;
  amount: string | number;
  description: string;
  dueDate?: string;
  launchDate?: string;
  date?: string;
  account?: { id?: number; name: string } | null;
  creditCard?: { id?: number; name: string } | null;
  category?: { id?: number; name: string } | null;
  parentTransactionId?: number | null;
  status?: string;
  creditCardId?: number | null;
}

interface UpcomingTransactionsManagerProps {
  upcomingTransactions: Transaction[];
  overdueTransactions: Transaction[];
}

export function UpcomingTransactionsManager({
  upcomingTransactions,
  overdueTransactions,
}: UpcomingTransactionsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatLeftDate = (dateStr: string) => {
    try {
      const parsed = parseISO(dateStr);
      const dayMonth = format(parsed, "dd/MM");
      const weekDay = format(parsed, "EEE", { locale: ptBR });
      const capitalizedWeek = weekDay.charAt(0).toUpperCase() + weekDay.slice(1).replace(".", "");
      return `${dayMonth} ${capitalizedWeek}`;
    } catch {
      return dateStr;
    }
  };

  const formatFullDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Overdue calculations
  const overdueExpenses = overdueTransactions.filter(
    (tx) => tx.type === "expense" || tx.type === "credit_card_expense",
  );
  const overdueIncomes = overdueTransactions.filter((tx) => tx.type === "income");
  const totalOverdueExpenses = overdueExpenses.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalOverdueIncomes = overdueIncomes.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const netOverdueAmount = totalOverdueIncomes - totalOverdueExpenses;
  const hasOverdue = overdueTransactions.length > 0;

  const getStatusBadge = (tx: Transaction) => {
    const isInvoice =
      tx.description.toLowerCase().includes("fatura") ||
      Boolean(tx.creditCard) ||
      Boolean(tx.creditCardId) ||
      tx.type === "credit_card_expense";

    const isVirtual = typeof tx.id === "number" && tx.id < 0;

    if (isInvoice) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 font-medium bg-purple-500/15 text-purple-400 border-purple-500/30"
        >
          Aberto
        </Badge>
      );
    }

    if (isVirtual) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 font-medium bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
        >
          Previsto
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 font-medium bg-amber-500/15 text-amber-400 border-amber-500/30"
      >
        Pendente
      </Badge>
    );
  };

  const getThematicIcon = (tx: Transaction) => {
    const isInvoice =
      tx.description.toLowerCase().includes("fatura") || Boolean(tx.creditCard) || Boolean(tx.creditCardId);
    const isIncome = tx.type === "income" || (tx.type === "transfer" && !!tx.parentTransactionId);

    if (isInvoice) {
      return <CreditCard className="w-4 h-4 text-purple-400" />;
    }
    if (isIncome) {
      return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
    }
    if (tx.type === "transfer") {
      return <Landmark className="w-4 h-4 text-blue-400" />;
    }
    return <ArrowDownRight className="w-4 h-4 text-rose-400" />;
  };

  return (
    <>
      <Card className="rounded-[1.5rem] sm:rounded-[2rem] border-white/10 shadow-sm bg-card overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5 sm:px-6">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <WalletCards className="w-5 h-5 text-primary" />
            Próximos Lançamentos
          </CardTitle>
          <span className="text-xs text-muted-foreground bg-white/5 border border-white/5 px-2.5 py-1 rounded-full font-medium">
            {upcomingTransactions.length} {upcomingTransactions.length === 1 ? "item" : "itens"}
          </span>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-6 pt-0 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
          {/* Alerta de Lançamentos Vencidos (se existirem) */}
          {hasOverdue && (
            <div
              onClick={() => setIsDialogOpen(true)}
              className="p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/30 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-sm group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-rose-400 group-hover:underline">
                    {overdueTransactions.length}{" "}
                    {overdueTransactions.length === 1 ? "lançamento vencido" : "lançamentos vencidos"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                    {overdueTransactions.map((tx) => tx.description).join(", ")}
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "text-sm font-bold tabular-nums shrink-0",
                  netOverdueAmount >= 0 ? "text-emerald-500" : "text-rose-500",
                )}
              >
                {netOverdueAmount >= 0 ? "+" : "-"}
                {formatCurrency(Math.abs(netOverdueAmount))}
              </span>
            </div>
          )}

          {/* Lista de Transações Futuras */}
          {upcomingTransactions.length === 0 && !hasOverdue ? (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-white/10 rounded-2xl bg-card/30">
              Nenhum lançamento previsto para este período.
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingTransactions.map((tx) => {
                const isIncome = tx.type === "income" || (tx.type === "transfer" && !!tx.parentTransactionId);
                const accountName = tx.account?.name || tx.creditCard?.name || "Conta";
                const categoryName = tx.category?.name || "Geral";

                return (
                  <div
                    key={tx.id}
                    className="p-3 sm:p-3.5 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-white/5 transition-all flex items-center justify-between gap-3 text-sm"
                  >
                    {/* Esquerda: Data na lateral */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-18 sm:w-20 text-xs font-semibold text-muted-foreground text-left whitespace-nowrap">
                        {formatLeftDate(tx.dueDate || tx.date || "")}
                      </div>

                      {/* Ícone Temático Arredondado com fundo suave */}
                      <div className="w-10 h-10 rounded-xl bg-card border border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                        {getThematicIcon(tx)}
                      </div>

                      {/* Título e Subtítulo */}
                      <div className="flex flex-col min-w-0">
                        <span
                          className="font-semibold text-foreground truncate max-w-[130px] sm:max-w-[200px]"
                          title={tx.description}
                        >
                          {tx.description}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[130px] sm:max-w-[200px]">
                          {accountName} • {categoryName}
                        </span>
                      </div>
                    </div>

                    {/* Direita: Valor em tabular-nums e Badge de Status */}
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span
                        className={cn(
                          "font-bold text-sm sm:text-base tabular-nums leading-tight",
                          isIncome ? "text-emerald-500" : "text-rose-500",
                        )}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(Number(tx.amount))}
                      </span>

                      {/* Badge de Status: Pendente / Previsto / Aberto */}
                      <div>{getStatusBadge(tx)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes dos Lançamentos Vencidos */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-5 h-5" />
              Lançamentos Vencidos
            </DialogTitle>
            <DialogDescription>Estes lançamentos estão pendentes e a data de vencimento já passou.</DialogDescription>
          </DialogHeader>

          {/* Resumo Rápido */}
          <div className="grid grid-cols-2 gap-3 my-2">
            <div className="rounded-xl border border-rose-500/20 p-3 text-center bg-rose-500/10">
              <span className="text-xs text-muted-foreground block mb-1 font-medium">Total Despesas</span>
              <span className="font-bold text-rose-500 text-sm tabular-nums">
                {formatCurrency(totalOverdueExpenses)}
              </span>
            </div>
            <div className="rounded-xl border border-emerald-500/20 p-3 text-center bg-emerald-500/10">
              <span className="text-xs text-muted-foreground block mb-1 font-medium">Total Receitas</span>
              <span className="font-bold text-emerald-500 text-sm tabular-nums">
                {formatCurrency(totalOverdueIncomes)}
              </span>
            </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto border border-white/10 rounded-xl">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueTransactions.map((tx) => {
                  const isIncome = tx.type === "income" || (tx.type === "transfer" && !!tx.parentTransactionId);
                  return (
                    <TableRow key={tx.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium whitespace-nowrap text-xs text-rose-500 tabular-nums">
                        {formatFullDate(tx.dueDate || tx.date || "")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm line-clamp-1">{tx.description}</span>
                          <span className="text-xs text-muted-foreground">
                            {tx.account?.name || tx.creditCard?.name || "Geral"} • {tx.category?.name || "Geral"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-bold whitespace-nowrap text-sm tabular-nums",
                          isIncome ? "text-emerald-500" : "text-rose-500",
                        )}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(Number(tx.amount))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
