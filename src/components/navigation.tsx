"use client";

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
  Bot,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  HandCoins,
  Home,
  Landmark,
  LogOut,
  PieChart,
  Plus,
  Receipt,
  Settings,
  ShoppingCart,
  Smartphone,
  TableProperties,
  Target,
  TrendingUp,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./brand-logo";
import { useSidebar } from "./sidebar-provider";
import { TransactionFormDialog } from "./transaction-form-dialog";

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
  { name: "Orçamentos", href: "/budgets", icon: Target },
  { name: "Widget Android", href: "/widget", icon: Smartphone },
  { name: "Power Grid", href: "/power-grid", icon: TableProperties },
  { name: "Planejamento", href: "/planning", icon: TrendingUp },
  { name: "Empréstimos", href: "/loans", icon: HandCoins },
  { name: "Mercado", href: "/market", icon: ShoppingCart },
  { name: "Categorias", href: "/categories", icon: PieChart },
  { name: "Importar", href: "/import", icon: Download },
  { name: "Assistente AI", href: "/assistant", icon: Bot },
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
  if (pathname.startsWith("/budgets")) {
    return { title: "Orçamentos", subtitle: "Orçamento Base Zero" };
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
  if (pathname.startsWith("/assistant")) {
    return { title: "Assistente AI", subtitle: "Consultor Financeiro Gemini" };
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
      {/* Desktop Sidebar (Apple Liquid Glass translucency) */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 h-screen bg-black/60 backdrop-blur-2xl border-r border-white/[0.08] z-40 transition-all duration-300",
          isCollapsed ? "w-[80px]" : "w-64",
        )}
      >
        <div
          className={cn(
            "h-20 flex items-center shrink-0 transition-all duration-300",
            isCollapsed ? "justify-center px-0" : "px-5",
          )}
        >
          <BrandLogo variant={isCollapsed ? "icon" : "horizontal"} iconSize={42} />
        </div>

        {/* Nova Transação Desktop Button */}
        <div className="px-3 pb-2 pt-1">
          <TransactionFormDialog
            trigger={
              <button
                type="button"
                className={cn(
                  "w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all hover:brightness-110 active:scale-95",
                  isCollapsed ? "px-0" : "px-4",
                )}
                title={isCollapsed ? "Nova Transação" : undefined}
              >
                <Plus className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">Nova Transação</span>}
              </button>
            }
          />
        </div>

        <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden",
                  isCollapsed ? "justify-center" : "gap-3",
                  isActive
                    ? "bg-gradient-to-r from-[#820AD1]/30 via-[#820AD1]/15 to-transparent text-white border border-[#BA42FF]/30 shadow-[0_0_20px_-6px_rgba(150,40,250,0.45)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white",
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive && "text-[#C048FF]")} />
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
              "flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden",
              isCollapsed ? "justify-center" : "gap-3",
              pathname.startsWith("/settings")
                ? "bg-gradient-to-r from-[#820AD1]/30 via-[#820AD1]/15 to-transparent text-white border border-[#BA42FF]/30 shadow-[0_0_20px_-6px_rgba(150,40,250,0.45)]"
                : "text-muted-foreground hover:bg-white/5 hover:text-white",
            )}
          >
            <Settings
              className={cn("w-5 h-5 shrink-0 transition-colors", pathname.startsWith("/settings") && "text-[#C048FF]")}
            />
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

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair da conta"
            className={cn(
              "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer mt-1",
              isCollapsed ? "justify-center" : "gap-3",
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Top Header com o estilo Apple Liquid Glass */}
      <header className="md:hidden flex h-16 items-center justify-between bg-black/60 backdrop-blur-2xl px-4 sticky top-0 z-40 border-b border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] transition-all">
        {/* Lado Esquerdo: Logo TGF e Identificação da Tela */}
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo variant="mobile" iconSize={36} />
          <div className="h-5 w-[1px] bg-white/10 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm sm:text-base leading-tight tracking-tight truncate">
              {pageInfo.title}
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">
              {pageInfo.subtitle}
            </span>
          </div>
        </div>

        {/* Lado Direito: Avatar com Menu */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
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
