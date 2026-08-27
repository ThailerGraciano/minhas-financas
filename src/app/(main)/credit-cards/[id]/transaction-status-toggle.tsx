"use client";

import { toggleTransactionStatus } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";

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

  const isPaid = status === "paid";

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`gap-1 sm:gap-2 px-1 sm:px-3 h-6 sm:h-8 ${isPaid ? "text-green-600 hover:text-green-700 hover:bg-green-100/50" : "text-muted-foreground hover:text-foreground"}`}
      onClick={handleToggle}
      isLoading={isPending}
      disabled={isPending}
      title={isPaid ? "Marcar como Pendente" : "Dar baixa"}
    >
      {isPaid ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Pago</span>
        </>
      ) : (
        <>
          <Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Pendente</span>
        </>
      )}
    </Button>
  );
}
