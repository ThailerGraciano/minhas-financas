'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { markTransactionAsPaid, payVirtualTransaction } from '@/app/actions/transactions';
import { CheckCircle2, Circle, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, CreditCard } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { MoreHorizontal, Pencil, Trash } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EditTransactionDialog } from '@/components/edit-transaction-dialog';
import { deleteTransaction } from '@/app/actions/transactions';

export function TransactionList({ transactions }: { transactions: any[] }) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [groupCreditCards, setGroupCreditCards] = useState(true);
  const [transactionToEdit, setTransactionToEdit] = useState<any>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  const handleDelete = async (mode: 'single' | 'future' = 'single') => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    await deleteTransaction(transactionToDelete.id, mode);
    setIsDeleting(false);
    setTransactionToDelete(null);
  };

  const handleMarkAsPaid = async (tx: any) => {
    if (tx.status === 'paid') return; // already paid

    setLoadingId(tx.id);
    if (tx.id < 0) {
      await payVirtualTransaction(tx);
    } else {
      await markTransactionAsPaid(tx.id);
    }
    setLoadingId(null);
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'income': return <ArrowUpCircle className="w-5 h-5 text-green-500" />;
      case 'transfer': return <ArrowRightLeft className="w-5 h-5 text-blue-500" />;
      case 'credit_card_expense': return <CreditCard className="w-5 h-5 text-orange-500" />;
      default: return <ArrowDownCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getSource = (tx: any) => {
    if (tx.type === 'credit_card_expense' && tx.creditCard) {
      return tx.creditCard.name;
    }
    if (tx.account) {
      return tx.account.name;
    }
    return 'Geral';
  };

  const displayedTransactions = useMemo(() => {
    let filteredTxs = transactions;
    if (showOnlyPending) {
      filteredTxs = transactions.filter(tx => tx.status === 'pending');
    }

    let processedTxs = filteredTxs;

    if (groupCreditCards) {
      const grouped = new Map();
      const otherTxs: any[] = [];

      filteredTxs.forEach(tx => {
        if (tx.type === 'credit_card_expense' && tx.creditCardId) {
          if (!grouped.has(tx.creditCardId)) {
            grouped.set(tx.creditCardId, {
              id: `cc-group-${tx.creditCardId}`,
              isGroup: true,
              type: 'expense',
              description: `Fatura: ${tx.creditCard?.name || 'Cartão'}`,
              amount: 0,
              date: tx.date,
              status: tx.status,
              creditCard: tx.creditCard,
              category: { name: 'Fatura' }
            });
          }
          const group = grouped.get(tx.creditCardId);
          group.amount += Number(tx.amount);
          if (tx.status === 'pending') group.status = 'pending';

          if (new Date(tx.date) > new Date(group.date)) {
            group.date = tx.date;
          }
        } else {
          otherTxs.push(tx);
        }
      });
      processedTxs = [...otherTxs, ...Array.from(grouped.values())];
    }

    return [...processedTxs].sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'amount_desc') {
        return Number(b.amount) - Number(a.amount);
      }
      if (sortBy === 'amount_asc') {
        return Number(a.amount) - Number(b.amount);
      }
      return 0;
    });
  }, [transactions, groupCreditCards, showOnlyPending, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/50 backdrop-blur-sm shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-by" className="text-sm font-medium text-muted-foreground whitespace-nowrap">Ordenar por:</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sort-by" className="w-[180px] h-9 bg-background/50">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Data (Mais recente)</SelectItem>
                <SelectItem value="date_asc">Data (Mais antiga)</SelectItem>
                <SelectItem value="amount_desc">Valor (Maior)</SelectItem>
                <SelectItem value="amount_asc">Valor (Menor)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch id="show-only-pending" checked={showOnlyPending} onCheckedChange={setShowOnlyPending} />
            <Label htmlFor="show-only-pending" className="text-sm font-medium cursor-pointer">Apenas não pagas</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="group-cc" checked={groupCreditCards} onCheckedChange={setGroupCreditCards} />
            <Label htmlFor="group-cc" className="text-sm font-medium cursor-pointer">Agrupar faturas de cartão</Label>
          </div>
        </div>
      </div>

      {displayedTransactions.length === 0 ? (
        <div className="text-center p-12 border rounded-lg border-dashed text-muted-foreground bg-muted/20">
          Nenhuma transação encontrada para este período.
        </div>
      ) : (
        <div className="space-y-4">
          {displayedTransactions.map((tx) => (
            <Card key={tx.id} className="transition-all hover:shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleMarkAsPaid(tx)}
                    disabled={loadingId === tx.id || tx.status === 'paid'}
                    className="focus:outline-none disabled:opacity-50 transition-transform hover:scale-110"
                    title={tx.status === 'paid' ? 'Pago' : 'Marcar como Pago'}
                  >
                    {loadingId === tx.id ? (
                      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : tx.status === 'paid' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground" />
                    )}
                  </button>

                  <div className="flex flex-col">
                    <span className="font-medium text-sm md:text-base line-clamp-1">{tx.description}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {getIcon(tx.type)}
                      <span className="truncate max-w-[80px] md:max-w-none">{getSource(tx)}</span>
                      <span className="mx-1">•</span>
                      <span className="truncate max-w-[80px] md:max-w-none">{tx.category?.name || 'Geral'}</span>
                      {tx.installmentTotal && tx.installmentTotal > 1 && (
                        <span className="ml-1 text-primary">
                          ({tx.installmentCurrent}/{tx.installmentTotal})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end text-right">
                    <span className={`font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-foreground'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(tx.date), "dd 'de' MMM", { locale: ptBR })}
                    </span>
                  </div>

                  {!tx.isGroup && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-2 hover:bg-muted rounded-full transition-colors focus:outline-none">
                        <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => setTransactionToEdit(tx)}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setTransactionToDelete(tx)}>
                          <Trash className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <EditTransactionDialog
        transaction={transactionToEdit}
        open={!!transactionToEdit}
        onOpenChange={(open) => !open && setTransactionToEdit(null)}
      />

      {/* Delete Alert */}
      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent>
          {transactionToDelete && (transactionToDelete.fixedTransactionId || (transactionToDelete.installmentTotal && transactionToDelete.installmentTotal > 1)) ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir transação recorrente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta transação faz parte de uma série recorrente ou parcelada. Deseja excluir apenas esta parcela ou esta e todas as próximas?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                <AlertDialogCancel disabled={isDeleting} className="cursor-pointer">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete('single');
                  }}
                  disabled={isDeleting}
                  className="border border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground cursor-pointer"
                >
                  Apenas esta
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete('future');
                  }}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
                >
                  {isDeleting ? "Excluindo..." : "Esta e as próximas"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta transação permanentemente? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete('single');
                  }}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
                >
                  {isDeleting ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
