"use client";

import { cn } from "@/lib/utils";
import { Navigation, type HeaderUserData } from "./navigation";
import { useSidebar } from "./sidebar-provider";

export function SidebarLayout({ children, user }: { children: React.ReactNode; user?: HeaderUserData }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <Navigation user={user} />
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          isCollapsed ? "md:ml-[80px]" : "md:ml-64",
        )}
      >
        {children}
      </div>
    </div>
  );
}
