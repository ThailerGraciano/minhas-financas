'use client';

import { useState, useMemo, useEffect } from 'react';
import { MarketReceiptData, MarketReceiptItem, getRecentMarketTransactions } from '@/app/actions/market';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Search } from 'lucide-react';
import { TransactionFormDialog } from '@/components/transaction-form-dialog';

const CATEGORIAS = [
  'Açougue',
  'Hortifruti',
  'Limpeza',
  'Higiene',
  'Mercearia',
  'Bebidas',
  'Padaria',
  'Frios',
  'Outros',
];

const UNIDADES = ['UN', 'KG', 'L', 'PCT', 'CX'];

interface ReceiptReviewGridProps {
  initialData: MarketReceiptData;
  onSave?: (data: MarketReceiptData, selectedTxIds: number[]) => void;
  isSaving?: boolean;
}

type RecentTransaction = {
  id: number;
  description: string;
  amount: string;
  date: string;
  type: string;
};

export function ReceiptReviewGrid({ initialData, onSave, isSaving }: ReceiptReviewGridProps) {
  const [data, setData] = useState<MarketReceiptData>(initialData);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [selectedTxIds, setSelectedTxIds] = useState<number[]>([]);

  const [searchTx, setSearchTx] = useState('');

  const loadTransactions = () => {
    getRecentMarketTransactions().then(setRecentTransactions).catch(console.error);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleItemChange = <K extends keyof MarketReceiptItem>(index: number, field: K, value: MarketReceiptItem[K]) => {
    const newItems = [...data.items];
    const item = { ...newItems[index], [field]: value };
    
    // Autocalculate net_price, discount_amount, and unit_price
    if (field === 'quantity') {
      const qty = Number(value) || 1;
      item.unit_price = Number((Number(item.original_price) / qty).toFixed(2));
    } else if (field === 'unit_price') {
      const qty = Number(item.quantity) || 1;
      item.original_price = Number((Number(value) * qty).toFixed(2));
      item.net_price = Number((item.original_price - Number(item.discount_amount)).toFixed(2));
    } else if (field === 'original_price') {
      const qty = Number(item.quantity) || 1;
      item.unit_price = Number((Number(value) / qty).toFixed(2));
      item.net_price = Number((Number(value) - Number(item.discount_amount)).toFixed(2));
    } else if (field === 'discount_amount') {
      item.net_price = Number((Number(item.original_price) - Number(value)).toFixed(2));
    } else if (field === 'net_price') {
      item.discount_amount = Number((Number(item.original_price) - Number(value)).toFixed(2));
    }

    newItems[index] = item;
    setData({ ...data, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...data.items];
    newItems.splice(index, 1);
    setData({ ...data, items: newItems });
  };

  const handleAddItem = () => {
    setData({
      ...data,
      items: [
        ...data.items,
        {
          description: '',
          quantity: 1,
          unit_measure: 'UN',
          category: 'Outros',
          unit_price: 0,
          original_price: 0,
          discount_amount: 0,
          net_price: 0,
        },
      ],
    });
  };

  const total = useMemo(() => {
    return data.items.reduce((acc, item) => acc + (Number(item.net_price) || 0), 0);
  }, [data.items]);

  const sortedAndFilteredTxs = useMemo(() => {
    let filtered = recentTransactions;
    if (searchTx) {
      const lower = searchTx.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.description.toLowerCase().includes(lower) || 
        tx.amount.includes(searchTx)
      );
    }
    
    // Sort by absolute difference to total, then date
    const finalTotal = total || 0;
    filtered.sort((a, b) => {
      const diffA = Math.abs(Number(a.amount) - finalTotal);
      const diffB = Math.abs(Number(b.amount) - finalTotal);
      if (Math.abs(diffA - diffB) > 2) {
         return diffA - diffB;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    return filtered;
  }, [recentTransactions, searchTx, total]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Estabelecimento</label>
          <Input 
            value={data.storeName} 
            onChange={(e) => setData({ ...data, storeName: e.target.value })} 
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Data</label>
          <Input 
            type="date"
            value={data.date} 
            onChange={(e) => setData({ ...data, date: e.target.value })} 
          />
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[350px] min-w-[200px]">Descrição</TableHead>
              <TableHead className="w-[80px]">Qtd</TableHead>
              <TableHead className="w-[110px]">Unidade</TableHead>
              <TableHead className="w-[160px]">Categoria</TableHead>
              <TableHead className="w-[100px]">Valor Un.</TableHead>
              <TableHead className="w-[120px]">Valor Bruto</TableHead>
              <TableHead className="w-[120px]">Desconto</TableHead>
              <TableHead className="w-[120px]">Líquido</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="p-1 md:p-2">
                  <Input 
                    value={item.description} 
                    onChange={(e) => handleItemChange(i, 'description', e.target.value)} 
                    className="h-9"
                  />
                </TableCell>
                <TableCell className="p-1 md:p-2">
                  <Input 
                    type="number" 
                    step="0.001"
                    value={item.quantity} 
                    onChange={(e) => handleItemChange(i, 'quantity', parseFloat(e.target.value) || 0)} 
                    className="h-9 px-2"
                  />
                </TableCell>
                <TableCell className="p-1 md:p-2">
                  <Select 
                    value={item.unit_measure} 
                    onValueChange={(val) => handleItemChange(i, 'unit_measure', val)}
                  >
                    <SelectTrigger className="h-9 px-2">
                      <SelectValue placeholder="UN" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIDADES.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1 md:p-2">
                  <Select 
                    value={item.category} 
                    onValueChange={(val) => handleItemChange(i, 'category', val)}
                  >
                    <SelectTrigger className="h-9 px-2 text-xs md:text-sm">
                      <SelectValue placeholder="Cat..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1 md:p-2">
                  <Input 
                    type="number" 
                    step="0.01"
                    value={item.unit_price} 
                    onChange={(e) => handleItemChange(i, 'unit_price', parseFloat(e.target.value) || 0)} 
                    className="h-9 px-2"
                  />
                </TableCell>
                <TableCell className="p-1 md:p-2">
                  <Input 
                    type="number" 
                    step="0.01"
                    value={item.original_price} 
                    onChange={(e) => handleItemChange(i, 'original_price', parseFloat(e.target.value) || 0)} 
                    className="h-9 px-2"
                  />
                </TableCell>
                <TableCell className="p-1 md:p-2">
                  <Input 
                    type="number" 
                    step="0.01"
                    value={item.discount_amount} 
                    onChange={(e) => handleItemChange(i, 'discount_amount', parseFloat(e.target.value) || 0)} 
                    className={`h-9 px-2 ${item.discount_amount > 0 ? "text-green-600 font-medium" : ""}`}
                  />
                </TableCell>
                <TableCell className="p-1 md:p-2">
                  <Input 
                    type="number" 
                    step="0.01"
                    value={item.net_price} 
                    onChange={(e) => handleItemChange(i, 'net_price', parseFloat(e.target.value) || 0)} 
                    className="h-9 px-2 font-medium"
                  />
                </TableCell>
                <TableCell className="p-1 md:p-2 text-center">
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(i)} className="text-destructive h-8 w-8">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} className="text-right font-medium">Total Calculado:</TableCell>
              <TableCell className="font-bold">R$ {total.toFixed(2)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <div className="mt-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-4 gap-4">
          <div>
            <h3 className="text-lg font-medium">Vincular Transações</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione as transações correspondentes a este cupom (opcional).
            </p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar..." 
                className="pl-8" 
                value={searchTx}
                onChange={e => setSearchTx(e.target.value)}
              />
            </div>
            <TransactionFormDialog 
              trigger={<Button variant="outline" size="icon" title="Nova Despesa"><Plus className="w-4 h-4" /></Button>} 
              onSuccess={loadTransactions}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-2 border rounded-md bg-muted/20">
          {sortedAndFilteredTxs.map(tx => {
            const isSelected = selectedTxIds.includes(tx.id);
            return (
              <div 
                key={tx.id}
                onClick={() => {
                  setSelectedTxIds(prev => 
                    isSelected ? prev.filter(id => id !== tx.id) : [...prev, tx.id]
                  );
                }}
                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                  isSelected ? 'border-primary bg-primary/10' : 'bg-background hover:border-primary/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium text-sm truncate pr-2">{tx.description}</span>
                  <span className={`text-sm font-semibold whitespace-nowrap ${
                    tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    R$ {Number(tx.amount).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              </div>
            );
          })}
          {sortedAndFilteredTxs.length === 0 && (
            <div className="col-span-full p-4 text-center text-sm text-muted-foreground">
              {recentTransactions.length === 0 ? "Buscando transações recentes..." : "Nenhuma transação encontrada."}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={handleAddItem} className="gap-2" isLoading={isSaving} disabled={isSaving}>
          <Plus className="w-4 h-4" />
          Adicionar Linha
        </Button>
        <Button onClick={() => onSave?.(data, selectedTxIds)} className="gap-2" isLoading={isSaving} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar Compra'}
        </Button>
      </div>
    </div>
  );
}
