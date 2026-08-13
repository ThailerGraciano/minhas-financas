import { Navigation } from '@/components/navigation';
import { TransactionFormDialog } from '@/components/transaction-form-dialog';
import { AiChat } from '@/components/ai-chat';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navigation />
      <main className="flex-1 pb-20 md:pb-8 pt-4 px-4 md:px-8 relative container mx-auto max-w-7xl">
        {children}
        <TransactionFormDialog />
        <AiChat />
      </main>
    </div>
  );
}
