import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthCore Digital — Talent Pipeline Tracker",
  description: "Internal candidate tracking tool built by HealthCore Digital for the People team's active searches",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <h1 className="text-lg font-semibold text-brand-dark">
            HealthCore Digital &mdash; Talent Pipeline Tracker
          </h1>
          <p className="text-sm text-slate-500">People Team &middot; Austin Headquarters</p>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
