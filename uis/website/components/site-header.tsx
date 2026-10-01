"use client";

import Image from "next/image";
import Link from "next/link";
import { LANGUAGES, useLanguage, type TranslationKey } from "@/lib/i18n";

const NAV_LINKS: { href: string; key: TranslationKey }[] = [
  { href: "#hero", key: "nav.home" },
  { href: "#services", key: "nav.services" },
  { href: "#locations", key: "nav.locations" },
  { href: "#contact", key: "nav.contact" },
];

type SiteHeaderProps = { variant: "home" | "form" };

export function SiteHeader({ variant }: SiteHeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const isHome = variant === "home";

  return (
    <header className="site-header">
      <div className="shell nav-wrap">
        <Link className="brand" href={isHome ? "#hero" : "/"} aria-label="HealthCore home">
          <Image src="/assets/logo.svg" alt="" width={42} height={42} unoptimized priority />
          <span>HealthCore</span>
        </Link>
        {isHome && (
          <nav className="desktop-nav" aria-label="Primary navigation">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {t(link.key)}
              </a>
            ))}
          </nav>
        )}
        <div className="nav-actions">
          <div className="language-switch" role="group" aria-label="Language">
            {LANGUAGES.map((code) => (
              <button
                key={code}
                type="button"
                className={language === code ? "active" : undefined}
                aria-pressed={language === code}
                onClick={() => setLanguage(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          {isHome ? (
            <Link className="button button-small" href="/application">
              {t("nav.cta")}
            </Link>
          ) : (
            <Link className="text-link" href="/">
              {t("form.back")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
