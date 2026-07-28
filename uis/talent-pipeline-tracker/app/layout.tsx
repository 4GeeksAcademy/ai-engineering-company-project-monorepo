import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Header from '@/components/layout/Header';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Nexova Solutions — Talent Pipeline Tracker | Operaciones de Selección',
  description:
    'Plataforma interna para el equipo de Operaciones de Selección y Talento de Nexova Solutions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-center text-xs">
          <p>
            &copy; {new Date().getFullYear()} Nexova Solutions — Operaciones de Selección. Todos los
            derechos reservados.
          </p>
        </footer>
      </body>
    </html>
  );
}
