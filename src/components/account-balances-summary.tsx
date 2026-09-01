import { Card, CardContent } from '@/components/ui/card';
import { Landmark, PiggyBank, Wallet, Archive } from 'lucide-react';

type BalanceSummary = {
  type: string;
  label: string;
  total: number;
};

export function AccountBalancesSummary({ balances, totalBalance }: { balances: BalanceSummary[], totalBalance: number }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'savings': return <PiggyBank className="w-5 h-5 text-blue-500" />;
      case 'wallet': return <Wallet className="w-5 h-5 text-green-500" />;
      case 'stash': return <Archive className="w-5 h-5 text-amber-500" />;
      default: return <Landmark className="w-5 h-5 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Saldo Total Geral */}
      <div className="py-6 px-2 flex flex-col space-y-2">
        <span className="text-sm font-medium text-muted-foreground">Saldo Total Geral</span>
        <span className="text-5xl md:text-6xl font-bold text-foreground tracking-tight">
          <span className="text-muted-foreground text-3xl md:text-4xl mr-2">R$</span>
          {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalBalance)}
        </span>
      </div>

      {/* Grid de mini-cards */}
      {balances.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {balances.map((b) => (
            <div key={b.type} className="bg-card rounded-none sm:rounded-[2rem] border-transparent shadow-sm flex flex-col justify-center p-4 md:px-4 py-6 sm:px-4 py-6 sm:p-6 space-y-3 md:space-y-4 min-w-0">
              <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
                {getIcon(b.type)}
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground truncate">{b.label}</span>
                <span className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">
                  <span className="text-muted-foreground text-sm mr-1">R$</span>
                  {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(b.total)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
