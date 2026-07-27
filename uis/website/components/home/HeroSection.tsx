"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="bg-gradient-to-r from-teal-700 via-cyan-700 to-sky-700 text-white" aria-labelledby="hero-title">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <h1 id="hero-title" className="text-3xl font-bold leading-tight sm:text-5xl">
          {t.hero.headline}
        </h1>
        <p className="mt-4 max-w-3xl text-base text-teal-50 sm:text-lg">{t.hero.subheadline}</p>
        <Link
          href="/application"
          className="mt-8 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-teal-800 shadow hover:bg-teal-50"
        >
          {t.hero.cta}
        </Link>
      </div>
    </section>
  );
}
