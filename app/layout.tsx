// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/Confirm';
import PageTransition from '@/components/PageTransition';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Alternance & Moi',
  description: 'Votre compagnon pour un suivi optimal de votre alternance',
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <ToastProvider>
          <ConfirmProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                <PageTransition>{children}</PageTransition>
              </main>
            </div>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}