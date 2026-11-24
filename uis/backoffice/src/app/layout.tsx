import type { Metadata } from "next";
import "./globals.css";
import { TelemetryRoot } from "@/components/TelemetryRoot";

export const metadata: Metadata = { title: "Nexova Backoffice", description: "Backoffice interno de Nexova" };

// The top bar lives in the (auth) and (protected) group layouts: only signed-in users see the menu.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <TelemetryRoot />
        {children}
      </body>
    </html>
  );
}
