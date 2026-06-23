'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toggleTransactionStatus } from '@/app/actions/transactions';
import { CheckCircle2, Circle } from 'lucide-react';

interface TransactionStatusToggleProps {
  transactionId: number;
  initialStatus: string;
}

export function TransactionStatusToggle({ transactionId, initialStatus }: TransactionStatusToggleProps) {
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState(initialStatus);

  const handleToggle = async () => {
    setIsPending(true);
    const result = await toggleTransactionStatus(transactionId, status);
    if (result.success && result.newStatus) {
      setStatus(result.newStatus);
    }
    setIsPending(false);
  };

  const isPaid = status === 'paid';

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`gap-2 ${isPaid ? 'text-green-600 hover:text-green-700 hover:bg-green-100/50' : 'text-muted-foreground hover:text-foreground'}`}
      onClick={handleToggle}
      disabled={isPending}
      title={isPaid ? 'Marcar como Pendente' : 'Dar baixa'}
    >
      {isPaid ? (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span className="hidden sm:inline">Pago</span>
        </>
      ) : (
        <>
          <Circle className="w-4 h-4" />
          <span className="hidden sm:inline">Pendente</span>
        </>
      )}
    </Button>
  );
}
