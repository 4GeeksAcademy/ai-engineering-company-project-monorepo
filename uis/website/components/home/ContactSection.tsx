"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export function ContactSection() {
  const { t } = useLanguage();

  return (
    <section id="contact" className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="contact-title">
      <h2 id="contact-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {t.contact.title}
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="font-medium text-slate-900">{t.contact.general}</p>
          <a href="mailto:info@healthcore.com" className="text-teal-700 hover:underline">
            info@healthcore.com
          </a>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="font-medium text-slate-900">{t.contact.austin}</p>
          <p className="text-slate-700">(512) 340-8800</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="font-medium text-slate-900">{t.contact.miami}</p>
          <p className="text-slate-700">(305) 510-7700</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="font-medium text-slate-900">{t.contact.uk}</p>
          <p className="text-slate-700">+44 20 7946 0100</p>
        </div>
      </div>
      <Link
        href="/application"
        className="mt-8 inline-block rounded-lg bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800"
      >
        {t.contact.cta}
      </Link>
    </section>
  );
}
