"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export function SiteHeader() {
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="border-b border-slate-200 bg-white" role="banner">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4" aria-label="Main navigation">
        <Link href="/" className="text-2xl font-bold text-teal-700">
          HealthCore
        </Link>
        <div className="flex items-center gap-4 text-sm sm:text-base">
          <Link href="/" className="font-semibold text-teal-700">
            {t.nav.home}
          </Link>
          <Link href="/application" className="text-slate-700 hover:text-teal-700">
            {t.nav.application}
          </Link>
          <Link href="/#services" className="hidden text-slate-600 hover:text-teal-700 sm:inline">
            {t.nav.services}
          </Link>
          <Link href="/#locations" className="hidden text-slate-600 hover:text-teal-700 sm:inline">
            {t.nav.locations}
          </Link>
          <Link href="/#contact" className="hidden text-slate-600 hover:text-teal-700 sm:inline">
            {t.nav.contact}
          </Link>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={lang === "en" ? "font-semibold text-teal-700" : "text-slate-600 hover:text-teal-700"}
            aria-pressed={lang === "en"}
          >
            EN
          </button>
          <span aria-hidden="true">|</span>
          <button
            type="button"
            onClick={() => setLang("es")}
            className={lang === "es" ? "font-semibold text-teal-700" : "text-slate-600 hover:text-teal-700"}
            aria-pressed={lang === "es"}
          >
            ES
          </button>
        </div>
      </nav>
    </header>
  );
}
