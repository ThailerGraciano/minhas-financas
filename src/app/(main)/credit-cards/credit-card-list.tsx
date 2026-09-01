'use client';

import { CreditCard, Edit, FileText, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreditCardFormDialog } from './credit-card-form-dialog';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import { deleteCreditCard } from '@/app/actions/credit-cards';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type CreditCardType = {
  id: number;
  name: string;
  creditLimit: string;
  closingDay: number;
  dueDay: number;
  invoice_total?: number;
  invoice_paid?: number;
  invoice_pending?: number;
  targetInvoiceMonth?: string;
};

export function CreditCardList({ cards, selectedMonth }: { cards: CreditCardType[], selectedMonth?: string }) {
  const [cardToDelete, setCardToDelete] = useState<CreditCardType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    if (!cardToDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    const result = await deleteCreditCard(cardToDelete.id);
    setIsDeleting(false);
    if (result.success) {
      setCardToDelete(null);
    } else {
      setDeleteError(result.error || "Erro ao excluir o cartão.");
    }
  };

  if (cards.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
        Nenhum cartão cadastrado ainda.
      </div>
    );
  }

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  };

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-4">
      {cards.map((card) => (
        <div key={card.id} className="bg-card rounded-none sm:rounded-[2rem] border-transparent shadow-sm transition-all hover:shadow-md flex flex-col p-5 md:px-4 py-6 sm:px-4 py-6 sm:p-6 min-w-0">
          <div className="flex flex-row items-center justify-between pb-4">
            <h3 className="text-lg font-bold truncate mr-2">{card.name}</h3>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full" 
                onClick={() => { setCardToDelete(card); setDeleteError(""); }}
              >
                <Trash className="w-4 h-4" />
              </Button>
              <div className="bg-orange-500/10 p-2.5 rounded-full shrink-0">
                <CreditCard className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {/* Fatura como destaque principal */}
            {card.invoice_total !== undefined ? (
              <>
                <div className="text-3xl md:text-4xl font-bold">{formatCurrency(card.invoice_total.toString())}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {card.targetInvoiceMonth 
                    ? `Fatura de ${format(new Date(`${card.targetInvoiceMonth}-01T00:00:00`), 'MMMM', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}`
                    : 'Fatura Atual'
                  }
                </p>
              </>
            ) : (
              <>
                <div className="text-3xl md:text-4xl font-bold">{formatCurrency(card.creditLimit)}</div>
                <p className="text-sm text-muted-foreground mt-1">Limite Total</p>
              </>
            )}

            {card.invoice_total !== undefined && (
              <div className="mt-4 space-y-3">
                <Progress 
                  value={Math.min((card.invoice_total / Number(card.creditLimit)) * 100, 100)} 
                  className="h-2"
                />

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor Pago:</span>
                  <span className="text-green-500 font-medium">{formatCurrency((card.invoice_paid || 0).toString())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Restante a Pagar:</span>
                  <span className="text-red-500 font-medium">{formatCurrency((card.invoice_pending || 0).toString())}</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-6 pt-4 border-t border-muted/50 text-sm">
              <div className="text-muted-foreground">
                Limite: <span className="font-medium text-foreground">{formatCurrency(card.creditLimit)}</span>
              </div>
              <div className="text-muted-foreground">
                Fecha dia: <span className="font-medium text-foreground">{card.closingDay}</span>
              </div>
              <div className="text-muted-foreground">
                Vence dia: <span className="font-medium text-foreground">{card.dueDay}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-6">
            <CreditCardFormDialog initialData={card}>
              <Button variant="outline" className="w-full flex-1 rounded-full bg-transparent border-border" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </CreditCardFormDialog>
            <Button variant="default" className="w-full flex-1 rounded-full shadow-md" size="sm" asChild>
              <Link href={`/credit-cards/${card.id}${card.targetInvoiceMonth ? `?month=${card.targetInvoiceMonth}` : (selectedMonth ? `?month=${selectedMonth}` : '')}`}>
                <FileText className="w-4 h-4 mr-2" />
                Faturas
              </Link>
            </Button>
          </div>
        </div>
      ))}

      <AlertDialog open={!!cardToDelete} onOpenChange={(open) => !open && setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cartão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cartão <strong>{cardToDelete?.name}</strong>?
            </AlertDialogDescription>
            {deleteError && (
              <p className="text-sm font-medium text-destructive mt-2">{deleteError}</p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
