import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthCore Digital | Operations Backoffice",
  description: "Internal HealthCore operations dashboard for billing, clinical, and workforce metrics.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
