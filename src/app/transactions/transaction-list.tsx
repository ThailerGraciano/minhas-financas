'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { markTransactionAsPaid } from '@/app/actions/transactions';
import { CheckCircle2, Circle, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, CreditCard } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TransactionList({ transactions }: { transactions: any[] }) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

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

  if (transactions.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg border-dashed text-muted-foreground bg-muted/20">
        Nenhuma transação encontrada para este período.
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {transactions.map((tx) => (
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

            <div className="flex flex-col items-end text-right">
              <span className={`font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-foreground'}`}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(parseISO(tx.date), "dd 'de' MMM", { locale: ptBR })}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
