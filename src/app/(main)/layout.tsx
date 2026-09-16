import { auth } from "@/auth";
import { BottomNavigationBar } from "@/components/bottom-navigation-bar";
import { SidebarLayout } from "@/components/sidebar-layout";
import { SidebarProvider } from "@/components/sidebar-provider";
import { TransactionFormDialog } from "@/components/transaction-form-dialog";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <SidebarProvider>
      <SidebarLayout user={session?.user}>
        <main className="flex-1 px-2 md:px-8 py-4 md:py-8 pb-24 md:pb-8 relative container mx-auto max-w-7xl w-full">
          {children}
          <TransactionFormDialog />
        </main>
        <BottomNavigationBar />
      </SidebarLayout>
    </SidebarProvider>
  );
}
