'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { markTransactionAsPaid } from '@/app/actions/transactions';
import { CheckCircle2, Circle, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, CreditCard } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { MoreHorizontal, Pencil, Trash } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EditTransactionDialog } from '@/components/edit-transaction-dialog';
import { deleteTransaction } from '@/app/actions/transactions';

export function TransactionList({ transactions }: { transactions: any[] }) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [groupCreditCards, setGroupCreditCards] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<any>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    await deleteTransaction(transactionToDelete.id);
    setIsDeleting(false);
    setTransactionToDelete(null);
  };

  const handleMarkAsPaid = async (id: number, currentStatus: string) => {
    if (currentStatus === 'paid') return; // already paid
    
    setLoadingId(id);
    await markTransactionAsPaid(id);
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
    if (!groupCreditCards) return transactions;

    const grouped = new Map();
    const otherTxs: any[] = [];

    transactions.forEach(tx => {
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

    return [...otherTxs, ...Array.from(grouped.values())].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [transactions, groupCreditCards]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 justify-end">
        <Switch id="group-cc" checked={groupCreditCards} onCheckedChange={setGroupCreditCards} />
        <Label htmlFor="group-cc" className="cursor-pointer">Agrupar faturas de cartão</Label>
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
                onClick={() => handleMarkAsPaid(tx.id, tx.status)}
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
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
