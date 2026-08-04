import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexova Backoffice | Panel de Consultores de Selección',
  description: 'Sistema interno de gestión de candidatos, scoring automatizado e inteligibilidad de vacantes para consultores de Nexova.',
};

export default function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
