import type { Metadata } from "next";
import "../../backoffice/theme.css";

export const metadata: Metadata = {
  title: "Brasaland Supplier Directory",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
