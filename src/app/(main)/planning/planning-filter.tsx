'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Account {
  id: number;
  name: string;
}

interface PlanningFilterProps {
  accounts: Account[];
}

export function PlanningFilter({ accounts }: PlanningFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentAccountId = searchParams.get('accountId') || 'checking_accounts';

  const handleAccountChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'checking_accounts') {
      params.set('accountId', value);
    } else {
      params.delete('accountId');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Considerar saldo da conta:</span>
      <Select value={currentAccountId} onValueChange={handleAccountChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todas as Contas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Contas</SelectItem>
          <SelectItem value="checking_accounts" className="font-semibold text-primary">Contas Correntes (Agrupado)</SelectItem>
          {accounts.map(acc => (
            <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
