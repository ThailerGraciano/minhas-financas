'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Settings, CreditCard, PieChart, Landmark, Receipt, TrendingUp, Download, ShoppingCart, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';

const navItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Contas', href: '/accounts', icon: Landmark },
  { name: 'Cartões', href: '/credit-cards', icon: CreditCard },
  { name: 'Transações', href: '/transactions', icon: Receipt },
  { name: 'Mercado', href: '/market', icon: ShoppingCart },
  { name: 'Planejamento', href: '/planning', icon: TrendingUp },
  { name: 'Importar', href: '/import', icon: Download },
  { name: 'Categorias', href: '/categories', icon: PieChart },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Top Header - Desktop & Tablet */}
      <header className="hidden md:flex h-20 items-center justify-between px-4 lg:px-8 w-full sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 gap-4">
        
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
            MF
          </div>
          <span className="text-xl font-bold tracking-tight hidden lg:block">Finanças</span>
        </div>

        {/* Horizontal Nav - Pill shaped */}
        <nav className="flex-1 flex justify-start xl:justify-center items-center gap-1 overflow-x-auto no-scrollbar px-2 pb-1 -mb-1">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all duration-300 whitespace-nowrap",
                  isActive 
                    ? "bg-foreground text-background shadow-md scale-105" 
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Profile & Settings */}
        <div className="flex items-center justify-end gap-2 lg:gap-4 shrink-0">
          <Link 
            href="/settings"
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Settings className="w-5 h-5" />
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sair da conta"
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <ModeToggle />
        </div>
      </header>

      {/* Mobile Top Header */}
      <header className="md:hidden flex h-14 items-center justify-between bg-background px-4 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
            MF
          </div>
          <span className="text-lg font-bold tracking-tight">Finanças</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <ModeToggle />
        </div>
      </header>

      {/* Mobile Bottom Nav - Show only top 5 items for mobile to fit nicely */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 min-w-0 h-full space-y-1 text-[10px] font-medium transition-all",
                  isActive 
                    ? "text-primary scale-110" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn("p-1.5 rounded-full transition-colors shrink-0", isActive ? "bg-primary/10" : "")}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="truncate w-full text-center px-0.5">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
