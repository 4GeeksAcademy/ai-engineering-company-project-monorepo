import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Talent Pipeline Tracker',
  description: 'Sistema interno de seguimiento de talento y candidatos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
