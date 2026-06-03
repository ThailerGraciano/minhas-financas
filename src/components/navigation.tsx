'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Settings, CreditCard, PieChart, Landmark, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';

const navItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Contas', href: '/accounts', icon: Landmark },
  { name: 'Cartões', href: '/credit-cards', icon: CreditCard },
  { name: 'Transações', href: '/transactions', icon: Receipt },
  { name: 'Ajustes', href: '/settings', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden flex h-14 items-center justify-between border-b bg-background px-4 sticky top-0 z-40">
        <span className="text-lg font-bold tracking-tight text-primary">Minhas Finanças</span>
        <ModeToggle />
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 border-r bg-background">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Minhas Finanças</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t mt-auto flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Tema</span>
          <ModeToggle />
        </div>
      </aside>

      {/* Mobile Bottom Nav - Show only top 5 items for mobile to fit nicely */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 text-[10px] font-medium transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
