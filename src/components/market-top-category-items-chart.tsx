'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface TopItem {
  description: string;
  netPrice: number;
  quantity: number;
  unitMeasure: string;
}

interface CategoryTopItems {
  category: string;
  items: TopItem[];
}

interface MarketTopCategoryItemsChartProps {
  data: CategoryTopItems[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value);

export function MarketTopCategoryItemsChart({ data }: MarketTopCategoryItemsChartProps) {
  if (data.length === 0) {
    return (
      <Card className="rounded-[2rem] border-transparent shadow-sm flex flex-col h-full md:col-span-2 w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Top 3 Produtos por Categoria</CardTitle>
          <CardDescription>Os itens mais caros de cada seção</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center min-h-[250px]">
          <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
        </CardContent>
      </Card>
    );
  }

  // Show only top 4 categories with most spending to fit the layout nicely
  const displayData = data.slice(0, 4);

  return (
    <Card className="rounded-[2rem] border-transparent shadow-sm flex flex-col h-full md:col-span-2 w-full min-w-0 overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold">Top 3 Produtos por Categoria</CardTitle>
        <CardDescription>Os itens de maior valor em cada seção</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayData.map((catData) => (
            <div key={catData.category} className="space-y-3">
              <h4 className="font-semibold text-primary border-b pb-1">{catData.category}</h4>
              <div className="space-y-2">
                {catData.items.map((item, idx) => {
                  // Calculate percentage relative to the most expensive item in THIS category
                  const maxPrice = catData.items[0].netPrice;
                  const percentage = maxPrice > 0 ? (item.netPrice / maxPrice) * 100 : 0;

                  return (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate pr-2 font-medium" title={item.description}>
                          {item.description}
                        </span>
                        <span className="font-bold shrink-0">{formatCurrency(item.netPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{item.quantity} {item.unitMeasure}</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mt-1">
                        <div 
                          className="bg-primary h-full rounded-full opacity-80" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
