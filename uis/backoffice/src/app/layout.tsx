import type { Metadata } from "next";
import { NavMenu } from "@/components/NavMenu";
import "./globals.css";

export const metadata: Metadata = { title: "Nexova Backoffice", description: "Backoffice interno de Nexova" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <header className="topbar">
          <span className="brand">Nexova · Backoffice</span>
          <NavMenu />
        </header>
        {children}
      </body>
    </html>
  );
}
