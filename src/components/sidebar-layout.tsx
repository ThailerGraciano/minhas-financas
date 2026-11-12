"use client";

import { AmbientLiquidBackground } from "./ambient-liquid-background";
import { cn } from "@/lib/utils";
import { Navigation, type HeaderUserData } from "./navigation";
import { useSidebar } from "./sidebar-provider";

export function SidebarLayout({ children, user }: { children: React.ReactNode; user?: HeaderUserData }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col md:flex-row relative">
      <AmbientLiquidBackground />
      <Navigation user={user} />
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10",
          isCollapsed ? "md:ml-[80px]" : "md:ml-64",
        )}
      >
        {children}
      </div>
    </div>
  );
}
