"use client";

import Link from "next/link";
import { clinics } from "@/lib/clinics";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

const SERVICES: { tone: string; symbol: string; titleKey: TranslationKey; textKey: TranslationKey; label: string }[] = [
  { tone: "teal", symbol: "＋", titleKey: "services.primary.title", textKey: "services.primary.text", label: "Request primary care" },
  { tone: "coral", symbol: "◌", titleKey: "services.specialist.title", textKey: "services.specialist.text", label: "Request a specialist consultation" },
  { tone: "ink", symbol: "✦", titleKey: "services.preventive.title", textKey: "services.preventive.text", label: "Request preventive care" },
];

const BENEFITS: { titleKey: TranslationKey; textKey: TranslationKey }[] = [
  { titleKey: "why.same.title", textKey: "why.same.text" },
  { titleKey: "why.hours.title", textKey: "why.hours.text" },
  { titleKey: "why.language.title", textKey: "why.language.text" },
  { titleKey: "why.network.title", textKey: "why.network.text" },
];

export function HomePage() {
  const { t } = useLanguage();

  return (
    <>
      <SiteHeader variant="home" />
      <main>
        <section className="hero" id="hero">
          <div className="shell hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">{t("hero.eyebrow")}</p>
              <h1>{t("hero.title")}</h1>
              <p className="hero-lede">{t("hero.lede")}</p>
              <div className="hero-actions">
                <Link className="button" href="/application">
                  {t("hero.cta")} <span aria-hidden="true">↗</span>
                </Link>
                <a className="text-link" href="#locations">
                  {t("hero.secondary")} <span aria-hidden="true">↓</span>
                </a>
              </div>
              <div className="hero-note">
                <span className="pulse-dot"></span>
                <span>{t("hero.note")}</span>
              </div>
            </div>
            <div className="hero-art" aria-label="HealthCore care illustration" role="img">
              <div className="art-sun"></div>
              <div className="art-cross">+</div>
              <div className="art-card art-card-top">
                <span className="art-icon">♥</span>
                <div>
                  <strong>{t("hero.card1.title")}</strong>
                  <small>{t("hero.card1.text")}</small>
                </div>
              </div>
              <div className="art-card art-card-bottom">
                <span className="art-number">12</span>
                <div>
                  <strong>{t("hero.card2.title")}</strong>
                  <small>{t("hero.card2.text")}</small>
                </div>
              </div>
              <div className="art-ring"></div>
            </div>
          </div>
          <div className="shell hero-stats">
            <div><strong>12</strong><span>{t("stats.clinics")}</span></div>
            <div><strong>2</strong><span>{t("stats.countries")}</span></div>
            <div><strong>2011</strong><span>{t("stats.since")}</span></div>
            <p>{t("stats.quote")}</p>
          </div>
        </section>

        <section className="section services-section" id="services">
          <div className="shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t("services.eyebrow")}</p>
                <h2>{t("services.title")}</h2>
              </div>
              <p>{t("services.intro")}</p>
            </div>
            <div className="service-grid">
              {SERVICES.map((service, index) => (
                <article key={service.titleKey} className={`service-card service-card-${service.tone}`}>
                  <span className="service-index">{String(index + 1).padStart(2, "0")}</span>
                  <div className="service-symbol">{service.symbol}</div>
                  <h3>{t(service.titleKey)}</h3>
                  <p>{t(service.textKey)}</p>
                  <Link href="/application" className="arrow-link" aria-label={service.label}>↗</Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section why-section">
          <div className="shell why-grid">
            <div>
              <p className="eyebrow">{t("why.eyebrow")}</p>
              <h2>{t("why.title")}</h2>
              <p className="why-lede">{t("why.lede")}</p>
              <Link className="button button-dark" href="/application">
                {t("why.cta")} <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="benefits-list">
              {BENEFITS.map((benefit, index) => (
                <div key={benefit.titleKey}>
                  <span className="benefit-mark">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{t(benefit.titleKey)}</h3>
                    <p>{t(benefit.textKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section locations-section" id="locations">
          <div className="shell">
            <div className="section-heading locations-heading">
              <div>
                <p className="eyebrow">{t("locations.eyebrow")}</p>
                <h2>{t("locations.title")}</h2>
              </div>
              <p>{t("locations.intro")}</p>
            </div>
            <div className="clinic-grid">
              {clinics.map((clinic) => (
                <article key={clinic.name} className={clinic.featured ? "clinic-card featured" : "clinic-card"}>
                  <div className="clinic-top">
                    <span className="clinic-state">{clinic.state}</span>
                    <span className="clinic-label">{t("locations.open")}</span>
                  </div>
                  <h3>{clinic.name}</h3>
                  <p>{clinic.city}</p>
                  <a href={`tel:${clinic.tel}`}>{clinic.phone}</a>
                  <small>{t(clinic.hoursKey)}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="contact-band" id="contact">
          <div className="shell contact-grid">
            <div>
              <p className="eyebrow eyebrow-light">{t("contact.eyebrow")}</p>
              <h2>{t("contact.title")}</h2>
            </div>
            <div className="contact-details">
              <p>{t("contact.intro")}</p>
              <a href="mailto:info@healthcore.com">info@healthcore.com</a>
              <a href="tel:+15123408800">{t("contact.austin")}</a>
              <a href="tel:+13055107700">{t("contact.miami")}</a>
              <a href="tel:+442079460100">{t("contact.uk")}</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter variant="home" />
    </>
  );
}
