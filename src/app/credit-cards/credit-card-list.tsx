'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

type CreditCardType = {
  id: number;
  name: string;
  creditLimit: string;
  closingDay: number;
  dueDay: number;
};

export function CreditCardList({ cards }: { cards: CreditCardType[] }) {
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
      {cards.map((card) => (
        <Card key={card.id} className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.name}</CardTitle>
            <CreditCard className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(card.creditLimit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Limite Total
            </p>
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
        </Card>
      ))}
    </div>
  );
}
