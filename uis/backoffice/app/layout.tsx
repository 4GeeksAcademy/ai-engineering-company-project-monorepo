import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrackFlow Backoffice",
  description: "Aplicacion interna de TrackFlow para gestion de inventario y operaciones.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${jakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-indigo-100 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3 md:px-8">
            <Link href="/" className="text-sm font-bold tracking-wide text-indigo-900">
              TrackFlow Backoffice
            </Link>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <Link className="rounded-lg px-3 py-2 transition hover:bg-indigo-50" href="/">
                Inicio
              </Link>
              <Link
                className="rounded-lg px-3 py-2 transition hover:bg-indigo-50"
                href="/incidents"
              >
                Incidencias
              </Link>
              <Link
                className="rounded-lg px-3 py-2 transition hover:bg-indigo-50"
                href="/suppliers"
              >
                Proveedores
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
