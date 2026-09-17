"use client";

import { cn } from "@/lib/utils";
import { CreditCard, Home, Landmark, Receipt, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navTabs = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Extrato", href: "/transactions", icon: Receipt },
  { name: "Contas", href: "/accounts", icon: Landmark },
  { name: "Cartões", href: "/credit-cards", icon: CreditCard },
  { name: "Ajustes", href: "/settings", icon: Settings },
];

export function BottomNavigationBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full h-16 bg-[#0B0B10]/95 backdrop-blur-lg border-t border-white/5 flex items-center justify-around px-2 z-50 md:hidden">
      {navTabs.map((item) => {
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
    </nav>
  );
}
