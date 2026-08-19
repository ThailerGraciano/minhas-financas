'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Home, Settings, CreditCard, PieChart, Landmark, Receipt, TrendingUp, Download, ShoppingCart, LogOut, Menu, TableProperties } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const navItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Contas', href: '/accounts', icon: Landmark },
  { name: 'Cartões', href: '/credit-cards', icon: CreditCard },
  { name: 'Transações', href: '/transactions', icon: Receipt },
  { name: 'Power Grid', href: '/power-grid', icon: TableProperties },
  { name: 'Mercado', href: '/market', icon: ShoppingCart },
  { name: 'Planejamento', href: '/planning', icon: TrendingUp },
  { name: 'Importar', href: '/import', icon: Download },
  { name: 'Categorias', href: '/categories', icon: PieChart },
];

export function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
      <header className="md:hidden flex h-14 items-center justify-between bg-background px-4 sticky top-0 z-40 border-b">
        <div className="flex items-center gap-3">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-foreground transition-colors">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="p-4 border-b text-left">
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    MF
                  </div>
                  <span className="text-xl font-bold tracking-tight">Finanças</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
                <div className="my-2 border-t border-border" />
                <Link
                  href="/settings"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
                    pathname.startsWith("/settings")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Settings className="w-5 h-5" />
                  Configurações
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              MF
            </div>
            <span className="text-lg font-bold tracking-tight">Finanças</span>
          </div>
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

    </>
  );
}
