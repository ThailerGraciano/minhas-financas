'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Home, Settings, CreditCard, PieChart, Landmark, Receipt, TrendingUp, Download, ShoppingCart, LogOut, TableProperties, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSidebar } from './sidebar-provider';

const navItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Transações', href: '/transactions', icon: Receipt },
  { name: 'Contas', href: '/accounts', icon: Landmark },
  { name: 'Cartões', href: '/credit-cards', icon: CreditCard },
  { name: 'Power Grid', href: '/power-grid', icon: TableProperties },
  { name: 'Planejamento', href: '/planning', icon: TrendingUp },
  { name: 'Mercado', href: '/market', icon: ShoppingCart },
  { name: 'Categorias', href: '/categories', icon: PieChart },
  { name: 'Importar', href: '/import', icon: Download },
];

export function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { isCollapsed, toggle } = useSidebar();

  const mainMobileItems = navItems.slice(0, 4);
  const moreMobileItems = navItems.slice(4);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 h-screen bg-background border-r border-white/5 z-40 transition-all duration-300",
        isCollapsed ? "w-[80px]" : "w-64"
      )}>
        <div className={cn("h-20 flex items-center shrink-0 transition-all duration-300", isCollapsed ? "justify-center px-0" : "px-6 gap-3")}>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
            MF
          </div>
          {!isCollapsed && <span className="text-xl font-bold tracking-tight whitespace-nowrap overflow-hidden">Finanças</span>}
        </div>

        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden",
                  isCollapsed ? "justify-center" : "gap-3",
                  isActive 
                    ? "bg-white/5 text-white border-l-4 border-primary rounded-l-none" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/5 flex flex-col gap-2 shrink-0">
          <Link 
            href="/settings"
            title={isCollapsed ? "Configurações" : undefined}
            className={cn(
              "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden",
              isCollapsed ? "justify-center" : "gap-3",
              pathname.startsWith("/settings")
                ? "bg-white/5 text-white border-l-4 border-primary rounded-l-none"
                : "text-muted-foreground hover:bg-white/5 hover:text-white"
            )}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Configurações</span>}
          </Link>
          
          <button
            onClick={toggle}
            className={cn(
              "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden text-muted-foreground hover:bg-white/5 hover:text-white",
              isCollapsed ? "justify-center" : "gap-3"
            )}
            title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5 shrink-0" /> : <ChevronLeft className="w-5 h-5 shrink-0" />}
            {!isCollapsed && <span className="whitespace-nowrap">Recolher</span>}
          </button>

          <div className={cn("flex items-center mt-2", isCollapsed ? "flex-col gap-4" : "justify-between px-3")}>
            <ModeToggle />
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sair da conta"
              className="text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center p-2 rounded-lg"
            >
              <LogOut className="w-5 h-5 shrink-0" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex h-14 items-center justify-between bg-background px-4 sticky top-0 z-40 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
            MF
          </div>
          <span className="text-lg font-bold tracking-tight">Finanças</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <ModeToggle />
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-background border-t border-white/5 flex items-center justify-around px-2 z-40">
        {mainMobileItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
              {item.name}
            </Link>
          );
        })}
        
        {/* More Menu (Sheet) */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center w-full h-full gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal className="w-5 h-5" />
              Mais
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0 border-t border-white/5 rounded-t-2xl">
            <SheetHeader className="p-4 border-b border-white/5 text-left">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="p-4 flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
              {moreMobileItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-white/5 text-white border-l-4 border-primary rounded-l-none"
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
              <div className="my-2 border-t border-white/5" />
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname.startsWith("/settings")
                    ? "bg-white/5 text-white border-l-4 border-primary rounded-l-none"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <Settings className="w-5 h-5 shrink-0" />
                Configurações
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
