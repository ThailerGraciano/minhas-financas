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
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 overflow-hidden relative shadow-sm">
        <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
          <Landmark className="w-32 h-32 -mt-4 -mr-4" />
        </div>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Saldo Total Geral</span>
            <span className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
              {formatCurrency(totalBalance)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Grid de mini-cards */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {balances.map((b) => (
            <Card key={b.type} className="hover:shadow-sm transition-all bg-card/50 backdrop-blur-sm border-muted">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center space-y-3">
                <div className="p-3 bg-muted/50 rounded-full">
                  {getIcon(b.type)}
                </div>
                <div className="flex flex-col w-full">
                  <span className="text-xs font-medium text-muted-foreground truncate">{b.label}</span>
                  <span className="text-lg font-bold text-foreground truncate">{formatCurrency(b.total)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
