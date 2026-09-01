'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { List, ArrowUpDown } from 'lucide-react';

export type MarketItem = {
  description: string;
  netPrice: number;
  quantity: number;
  unitMeasure: string;
  category: string;
};

interface MarketAllItemsListProps {
  items: MarketItem[];
}

type SortKey = 'description' | 'category' | 'quantity' | 'netPrice';
type SortOrder = 'asc' | 'desc';

const SortIcon = () => <ArrowUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />;

export function MarketAllItemsList({ items }: MarketAllItemsListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('netPrice');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatQuantity = (qty: number, measure: string) => {
    const formattedQty = Number.isInteger(qty) ? qty : qty.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
    return `${formattedQty} ${measure}`;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'netPrice' || key === 'quantity' ? 'desc' : 'asc');
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let aVal: string | number = a[sortKey];
      let bVal: string | number = b[sortKey];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortKey, sortOrder]);

  return (
    <Card className="rounded-none sm:rounded-[2rem] border-transparent shadow-sm w-full min-w-0">
      <CardHeader className="flex flex-row items-center gap-2 pb-4">
        <List className="h-5 w-5 text-primary" />
        <div>
          <CardTitle className="text-xl font-bold">Todos os Itens Comprados</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Listagem completa de itens do mês
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum item encontrado neste mês.</p>
        ) : (
          <div className="overflow-auto max-h-[400px] border rounded-xl">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur-sm shadow-sm z-10">
                <TableRow>
                  <TableHead 
                    className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center">
                      Produto
                      {sortKey === 'description' && <SortIcon />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center">
                      Categoria
                      {sortKey === 'category' && <SortIcon />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold text-foreground text-right w-[100px] cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-end">
                      Qtd
                      {sortKey === 'quantity' && <SortIcon />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold text-foreground text-right w-[120px] cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('netPrice')}
                  >
                    <div className="flex items-center justify-end">
                      Total
                      {sortKey === 'netPrice' && <SortIcon />}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item, index) => (
                  <TableRow key={`${item.description}-${index}`}>
                    <TableCell className="font-medium text-sm">{item.description}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        {item.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatQuantity(item.quantity, item.unitMeasure)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">
                      {formatCurrency(item.netPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
