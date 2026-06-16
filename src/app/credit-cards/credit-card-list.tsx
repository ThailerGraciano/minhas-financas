'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CreditCard, Edit, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreditCardFormDialog } from './credit-card-form-dialog';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';

type CreditCardType = {
  id: number;
  name: string;
  creditLimit: string;
  closingDay: number;
  dueDay: number;
  invoice_total?: number;
  invoice_paid?: number;
  invoice_pending?: number;
};

export function CreditCardList({ cards, selectedMonth }: { cards: CreditCardType[], selectedMonth?: string }) {
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

  const monthLabel = selectedMonth ? format(new Date(`${selectedMonth}-01T00:00:00`), 'MMMM yyyy', { locale: ptBR }) : '';
  const capitalizedMonth = monthLabel ? monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) : '';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
      {cards.map((card) => (
        <Card key={card.id} className="transition-all hover:shadow-md flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.name}</CardTitle>
            <CreditCard className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-bold">{formatCurrency(card.creditLimit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Limite Total
            </p>

            {card.invoice_total !== undefined && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg space-y-3">
                {capitalizedMonth && (
                  <div className="font-semibold text-sm border-b pb-2 mb-2">
                    Fatura de {capitalizedMonth}
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total da Fatura:</span>
                  <span className="font-semibold">{formatCurrency(card.invoice_total.toString())}</span>
                </div>
                
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

            <div className="flex gap-4 mt-4 pt-4 border-t text-sm">
              <div>
                <span className="text-muted-foreground">Fecha dia: </span>
                <span className="font-medium">{card.closingDay}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Vence dia: </span>
                <span className="font-medium">{card.dueDay}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2 pt-0">
            <CreditCardFormDialog initialData={card}>
              <Button variant="outline" className="w-full flex-1" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </CreditCardFormDialog>
            <Button variant="default" className="w-full flex-1" size="sm" asChild>
              <Link href={`/credit-cards/${card.id}${selectedMonth ? `?month=${selectedMonth}` : ''}`}>
                <FileText className="w-4 h-4 mr-2" />
                Faturas
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
