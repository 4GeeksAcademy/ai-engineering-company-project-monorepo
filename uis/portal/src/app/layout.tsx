import type { Metadata } from "next";
import { PortalFooter } from "@/components/PortalFooter";
import { PortalHeader } from "@/components/PortalHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brasaland Portal",
  description:
    "Brasa Points for guests and location sales in COP and USD for Brasaland staff. Colombia and Florida.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Source+Sans+3:ital,wght@0,400;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PortalHeader />
        {children}
        <PortalFooter />
      </body>
    </html>
  );
}
