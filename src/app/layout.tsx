import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/navigation';
import { TransactionFormDialog } from '@/components/transaction-form-dialog';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Minhas Finanças',
  description: 'Gerenciador financeiro pessoal',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
            <Navigation />
            <main className="flex-1 md:ml-64 pb-16 md:pb-0 min-h-screen relative">
              {children}
              <TransactionFormDialog />
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
