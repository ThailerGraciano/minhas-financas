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
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const mainTabs = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Extrato", href: "/transactions", icon: Receipt },
  { name: "Contas", href: "/accounts", icon: Landmark },
  { name: "Cartões", href: "/credit-cards", icon: CreditCard },
];

const moreItems = [
  { name: "Orçamentos", href: "/budgets", icon: Target },
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

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href)) || pathname.startsWith("/settings");

  return (
    <nav className="fixed bottom-0 left-0 w-full h-16 bg-[#0B0B10]/95 backdrop-blur-lg border-t border-white/5 flex items-center justify-around px-2 z-50 md:hidden">
      {mainTabs.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 text-[10px] font-medium transition-colors select-none",
              isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110 text-primary")} />
            <span className={cn(isActive && "text-primary")}>{item.name}</span>
          </Link>
        );
      })}

      {/* Botão Mais que abre o Sheet com todas as outras opções */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 text-[10px] font-medium transition-colors select-none cursor-pointer",
              isMoreActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MoreHorizontal className={cn("w-5 h-5 transition-transform", isMoreActive && "scale-110 text-primary")} />
            <span className={cn(isMoreActive && "text-primary")}>Mais</span>
          </button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="p-0 border-t border-white/10 bg-[#0B0B10]/98 backdrop-blur-xl rounded-t-3xl z-[100]"
        >
          <SheetHeader className="p-4 border-b border-white/5 text-left">
            <SheetTitle className="text-base font-bold text-foreground">Menu & Ferramentas</SheetTitle>
          </SheetHeader>
          <div className="p-4 flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
            {moreItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary border-l-4 border-primary rounded-l-none font-semibold"
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
                "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                pathname.startsWith("/settings")
                  ? "bg-primary/10 text-primary border-l-4 border-primary rounded-l-none font-semibold"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white",
              )}
            >
              <Settings className="w-5 h-5 shrink-0" />
              Configurações / Ajustes
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
