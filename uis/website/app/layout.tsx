import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthCore | Outpatient Healthcare Services",
  description:
    "HealthCore offers same-day outpatient care, specialist consultations, and preventive health services across US and UK clinics.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
