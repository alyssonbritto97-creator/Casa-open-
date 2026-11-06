import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Open House',
  description: 'Better home · Prosperous home',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="top">
          <a href="/" className="brand">Open House</a>
          <nav>
            <a href="/next/">Resumo</a>
            <a href="/next/ficha/">Ficha do imóvel</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer>Open House • © Converta+ • Jose Brito</footer>
      </body>
    </html>
  );
}
