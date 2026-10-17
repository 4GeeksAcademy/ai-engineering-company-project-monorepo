import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/auth/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Nexova | Backoffice", template: "%s | Nexova Backoffice" },
  description: "Backoffice interno de Nexova.",
};

export const viewport: Viewport = { themeColor: "#0f172a" };

// Server component: only the shell. The session lives in the browser (localStorage), so everything that
// depends on it is a client component under <AuthProvider>.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-950">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
