import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrackFlow Backoffice",
  description: "Incident analysis console for TrackFlow CX",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
