'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getMarketReceiptDetails } from '@/app/actions/market';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag } from 'lucide-react';

interface MarketReceiptsListProps {
  receipts: {
    id: string;
    storeName: string;
    date: Date;
    totalAmount: string;
  }[];
}

type MarketItem = {
  id: string;
  description: string;
  quantity: string;
  unitMeasure: string;
  category: string | null;
  unitPrice: string;
  originalPrice: string;
  discountAmount: string;
  netPrice: string;
};

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value));

export function MarketReceiptsList({ receipts }: MarketReceiptsListProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<{ id: string; storeName: string; date: Date } | null>(null);
  const [items, setItems] = useState<MarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedReceipt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(true);
      getMarketReceiptDetails(selectedReceipt.id)
        .then(res => setItems(res))
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    } else {
      setItems([]);
    }
  }, [selectedReceipt]);

  return (
    <>
      <Card className="rounded-none sm:rounded-[2rem] border-transparent shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Histórico de Compras
          </CardTitle>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed mt-4">
              Nenhuma compra encontrada neste mês.
            </div>
          ) : (
            <div className="rounded-md border mt-4 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Mercado/Loja</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow 
                      key={receipt.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedReceipt(receipt)}
                    >
                      <TableCell>{format(new Date(receipt.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium">{receipt.storeName}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(receipt.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-5xl xl:max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Detalhes da Compra
            </DialogTitle>
            {selectedReceipt && (
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedReceipt.storeName}</span>
                {' • '}
                {format(new Date(selectedReceipt.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            )}
          </DialogHeader>

          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Un</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Preço Un.</TableHead>
                      <TableHead className="text-right">Total Item</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const isDiscounted = Number(item.discountAmount) > 0;
                      return (
                        <TableRow key={item.id} className={isDiscounted ? "bg-green-500/5 hover:bg-green-500/10" : ""}>
                          <TableCell className="font-medium">
                            {item.description}
                            {isDiscounted && (
                              <Badge variant="outline" className="ml-2 text-[10px] text-green-600 border-green-200 bg-green-50">
                                -{formatCurrency(item.discountAmount)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unitMeasure}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal text-xs">
                              {item.category || 'Outros'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(item.netPrice)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
