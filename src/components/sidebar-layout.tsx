'use client';

import { useSidebar } from './sidebar-provider';
import { cn } from '@/lib/utils';
import { Navigation } from './navigation';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <Navigation />
      <div className={cn("flex-1 flex flex-col min-w-0 transition-all duration-300", isCollapsed ? "md:ml-[80px]" : "md:ml-64")}>
        {children}
      </div>
    </div>
  );
}
