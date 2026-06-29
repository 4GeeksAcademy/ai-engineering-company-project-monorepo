import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SidebarNav } from "./components/SidebarNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrackFlow Backoffice",
  description: "Panel interno para operaciones y validacion de leads de TrackFlow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-100 text-slate-900">
        <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
          <aside className="border-b border-slate-200 bg-slate-900 p-5 text-slate-100 lg:border-b-0 lg:border-r">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">TrackFlow</p>
              <h1 className="mt-2 text-lg font-semibold">Backoffice</h1>
            </div>
            <SidebarNav />
          </aside>

          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
