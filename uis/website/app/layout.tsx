import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TrackFlow | Faster routes, smarter deliveries",
  description:
    "TrackFlow is a logistics partner for warehousing, inventory management, order fulfillment, and last-mile delivery across the United States and Spain.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
