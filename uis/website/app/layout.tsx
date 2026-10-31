import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TrackFlow | Faster routes, smarter deliveries",
  description:
    "TrackFlow is a logistics partner for warehousing, inventory management, order fulfillment, and last-mile delivery across the United States and Spain.",
  icons: [
    {
      rel: "icon",
      url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%232563eb'/><text x='6' y='24' font-size='22' font-weight='700' fill='white' font-family='monospace'>TF</text></svg>",
    },
  ],
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
