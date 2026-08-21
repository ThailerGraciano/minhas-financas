import { SidebarProvider } from '@/components/sidebar-provider';
import { SidebarLayout } from '@/components/sidebar-layout';
import { TransactionFormDialog } from '@/components/transaction-form-dialog';
import { AiChat } from '@/components/ai-chat';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <SidebarLayout>
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 relative container mx-auto max-w-7xl w-full">
          {children}
          <TransactionFormDialog />
          <AiChat />
        </main>
      </SidebarLayout>
    </SidebarProvider>
  );
}
