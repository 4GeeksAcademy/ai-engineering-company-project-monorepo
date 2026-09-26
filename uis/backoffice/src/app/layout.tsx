import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Nexova Incident Analyzer", description: "Analizador de incidentes" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
