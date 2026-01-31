import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ARCHECO Blog CMS',
  description: 'AI搭載ブログ記事生成CMS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen">
            <Header />
            <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
