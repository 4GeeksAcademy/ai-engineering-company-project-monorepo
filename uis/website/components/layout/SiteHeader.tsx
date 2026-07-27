"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { appUrls } from "@/lib/app-urls";

export function SiteHeader() {
  const { lang, setLang, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks: { href: string; label: string; external?: boolean }[] = [
    { href: "/", label: t.nav.home },
    { href: "/application", label: t.nav.application },
    { href: `${appUrls.backoffice}/utilities`, label: t.nav.utilities, external: true },
    { href: appUrls.tracker, label: t.nav.tracker, external: true },
  ];

  return (
    <header className="border-b border-slate-200 bg-white" role="banner">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4" aria-label="Main navigation">
        <Link href="/" className="text-2xl font-bold text-teal-700">
          HealthCore
        </Link>

        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium sm:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? t.nav.closeMenu : t.nav.menu}
        </button>

        <div className="hidden items-center gap-4 text-sm sm:flex sm:text-base">
          {navLinks.map((link) =>
            link.external ? (
              <a key={link.href} href={link.href} className="text-slate-700 hover:text-teal-700">
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href} className="text-slate-700 hover:text-teal-700">
                {link.label}
              </Link>
            )
          )}
          <LangToggle lang={lang} setLang={setLang} />
        </div>
      </nav>

      {mobileOpen ? (
        <div id="mobile-nav" className="border-t border-slate-100 px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-3 text-sm">
            {navLinks.map((link) =>
              link.external ? (
                <a key={link.href} href={link.href} className="text-slate-700 hover:text-teal-700">
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href} className="text-slate-700 hover:text-teal-700">
                  {link.label}
                </Link>
              )
            )}
            <LangToggle lang={lang} setLang={setLang} />
          </div>
        </div>
      ) : null}

      <nav
        className="mx-auto hidden max-w-6xl flex-wrap items-center gap-4 px-4 pb-4 text-xs sm:flex sm:text-sm"
        aria-label="Home section navigation"
      >
        <Link href="/#services" className="text-slate-600 hover:text-teal-700">
          {t.nav.services}
        </Link>
        <Link href="/#locations" className="text-slate-600 hover:text-teal-700">
          {t.nav.locations}
        </Link>
        <Link href="/#contact" className="text-slate-600 hover:text-teal-700">
          {t.nav.contact}
        </Link>
      </nav>
    </header>
  );
}

function LangToggle({ lang, setLang }: { lang: "en" | "es"; setLang: (lang: "en" | "es") => void }) {
  return (
    <div className="flex items-center gap-2">
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
  );
}
