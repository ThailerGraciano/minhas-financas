import { SidebarLayout } from "@/components/sidebar-layout";
import { SidebarProvider } from "@/components/sidebar-provider";
import { TransactionFormDialog } from "@/components/transaction-form-dialog";

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
        </main>
      </SidebarLayout>
    </SidebarProvider>
  );
}
