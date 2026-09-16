"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Download,
  HandCoins,
  Home,
  Landmark,
  MoreHorizontal,
  PieChart,
  Receipt,
  Settings,
  ShoppingCart,
  TableProperties,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Transações", href: "/transactions", icon: Receipt },
  { name: "Contas", href: "/accounts", icon: Landmark },
  { name: "Cartões", href: "/credit-cards", icon: CreditCard },
  { name: "Power Grid", href: "/power-grid", icon: TableProperties },
  { name: "Planejamento", href: "/planning", icon: TrendingUp },
  { name: "Empréstimos", href: "/loans", icon: HandCoins },
  { name: "Mercado", href: "/market", icon: ShoppingCart },
  { name: "Categorias", href: "/categories", icon: PieChart },
  { name: "Importar", href: "/import", icon: Download },
];

export function BottomNavigationBar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const mainMobileItems = navItems.slice(0, 3);
  const moreMobileItems = navItems.slice(3);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[#0B0B10] border-t border-white/5 flex items-center justify-around px-2 z-50">
      {mainMobileItems.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon className={cn("w-6 h-6 transition-transform", isActive && "scale-110")} />
            {item.name}
          </Link>
        );
      })}

      {/* More Menu (Sheet) */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center justify-center w-full h-full gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            <MoreHorizontal className="w-6 h-6" />
            Mais
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="p-0 border-t border-white/5 rounded-t-2xl z-[100]">
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
                      : "text-muted-foreground hover:bg-white/5 hover:text-white",
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
                  : "text-muted-foreground hover:bg-white/5 hover:text-white",
              )}
            >
              <Settings className="w-5 h-5 shrink-0" />
              Configurações
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
