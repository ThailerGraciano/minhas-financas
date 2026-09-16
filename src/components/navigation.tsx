"use client";

import { ModeToggle } from "@/components/mode-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  HandCoins,
  Home,
  Landmark,
  LogOut,
  PieChart,
  Receipt,
  Settings,
  ShoppingCart,
  TableProperties,
  TrendingUp,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-provider";

export interface HeaderUserData {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

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

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "MF";
}

function getPageInfo(pathname: string): { title: string; subtitle: string } {
  if (pathname === "/planning" || pathname.startsWith("/planning/")) {
    return { title: "Planejamento", subtitle: "Gestão e Projeções" };
  }
  if (pathname === "/" || pathname === "") {
    return { title: "Dashboard", subtitle: "Visão Geral" };
  }
  if (pathname.startsWith("/transactions")) {
    return { title: "Transações", subtitle: "Extrato e Lançamentos" };
  }
  if (pathname.startsWith("/accounts")) {
    return { title: "Contas", subtitle: "Saldos e Instituições" };
  }
  if (pathname.startsWith("/credit-cards")) {
    return { title: "Cartões", subtitle: "Faturas e Limites" };
  }
  if (pathname.startsWith("/power-grid")) {
    return { title: "Power Grid", subtitle: "Matriz Financeira" };
  }
  if (pathname.startsWith("/loans")) {
    return { title: "Empréstimos", subtitle: "Gestão de Dívidas" };
  }
  if (pathname.startsWith("/market")) {
    return { title: "Mercado", subtitle: "Compras e Listas" };
  }
  if (pathname.startsWith("/categories")) {
    return { title: "Categorias", subtitle: "Organização" };
  }
  if (pathname.startsWith("/settings")) {
    return { title: "Configurações", subtitle: "Preferências" };
  }
  if (pathname.startsWith("/import")) {
    return { title: "Importar", subtitle: "Extratos Bancários" };
  }
  return { title: "Finanças", subtitle: "Gestão Pessoal" };
}

export function Navigation({ user }: { user?: HeaderUserData }) {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebar();
  const initials = getInitials(user?.name, user?.email);
  const pageInfo = getPageInfo(pathname);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 h-screen bg-background border-r border-white/5 z-40 transition-all duration-300",
          isCollapsed ? "w-[80px]" : "w-64",
        )}
      >
        <div
          className={cn(
            "h-20 flex items-center shrink-0 transition-all duration-300",
            isCollapsed ? "justify-center px-0" : "px-6 gap-3",
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-orange-500 to-amber-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-primary/25 ring-1 ring-white/20 select-none shrink-0">
            MF
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-lg font-bold tracking-tight whitespace-nowrap overflow-hidden">Finanças</span>
              <span className="text-[11px] text-muted-foreground font-medium">Gestão Pessoal</span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
                    : "text-muted-foreground hover:bg-white/5 hover:text-white",
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/5 flex flex-col gap-2 shrink-0">
          {!isCollapsed && user && (
            <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl border border-white/5 mb-1">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || "Avatar"}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-white/15"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted/60 border border-white/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">{user.name || "Usuário"}</span>
                <span className="text-[10px] text-muted-foreground truncate">{user.email || ""}</span>
              </div>
            </div>
          )}

          <Link
            href="/settings"
            title={isCollapsed ? "Configurações" : undefined}
            className={cn(
              "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden",
              isCollapsed ? "justify-center" : "gap-3",
              pathname.startsWith("/settings")
                ? "bg-white/5 text-white border-l-4 border-primary rounded-l-none"
                : "text-muted-foreground hover:bg-white/5 hover:text-white",
            )}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Configurações</span>}
          </Link>

          <button
            onClick={toggle}
            className={cn(
              "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden text-muted-foreground hover:bg-white/5 hover:text-white cursor-pointer",
              isCollapsed ? "justify-center" : "gap-3",
            )}
            title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5 shrink-0" /> : <ChevronLeft className="w-5 h-5 shrink-0" />}
            {!isCollapsed && <span className="whitespace-nowrap">Recolher</span>}
          </button>

          <div className={cn("flex items-center mt-2", isCollapsed ? "flex-col gap-4" : "justify-between px-3")}>
            <ModeToggle />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sair da conta"
              className="text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center p-2 rounded-lg cursor-pointer"
            >
              <LogOut className="w-5 h-5 shrink-0" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header com o estilo executivo */}
      <header className="md:hidden flex h-16 items-center justify-between bg-background/95 backdrop-blur-md px-4 sticky top-0 z-40 border-b border-white/5 transition-all">
        {/* Lado Esquerdo: Logo MF com degradê e Identificação da Tela */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative group flex items-center justify-center shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-orange-500 to-amber-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-primary/25 ring-1 ring-white/20 select-none">
              MF
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm sm:text-base leading-tight tracking-tight truncate">
              {pageInfo.title}
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">
              {pageInfo.subtitle}
            </span>
          </div>
        </div>

        {/* Lado Direito: Notificações, Tema e Avatar com Menu */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Botão de Notificações */}
          <button
            type="button"
            aria-label="Notificações"
            className="relative w-9 h-9 rounded-full bg-card hover:bg-muted/80 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm hover:border-white/20 active:scale-95"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
          </button>

          {/* Alternador de Tema */}
          <ModeToggle />

          {/* Avatar com Menu Suspenso */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background cursor-pointer"
                aria-label="Menu do usuário"
              >
                {user?.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || "Avatar"}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-white/15 group-hover:ring-primary transition-all shadow-sm"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-muted/60 border border-white/10 group-hover:border-primary/50 flex items-center justify-center text-primary font-bold text-xs tracking-wider transition-all shadow-sm">
                    {initials}
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || "Usuário"}</p>
                  {user?.email && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>Configurações</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer flex items-center gap-2"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Bottom Nav gerenciado pelo BottomNavigationBar global */}
    </>
  );
}
