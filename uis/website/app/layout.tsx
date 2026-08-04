import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nexova Solutions | Transformación Digital en RRHH y Talento',
  description: 'Nexova Solutions impulsa operaciones de talento con automatización, IA y visibilidad en tiempo real para empresas de tecnología, retail y finanzas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
