import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth-gate";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthCore Digital | Operations workspace",
  description: "HealthCore Digital internal operations workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><AuthGate>{children}</AuthGate></body>
    </html>
  );
}
