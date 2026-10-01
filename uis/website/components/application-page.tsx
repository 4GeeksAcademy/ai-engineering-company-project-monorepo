"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { AppointmentForm } from "./appointment-form";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function ApplicationPage() {
  const { t } = useLanguage();

  return (
    <div className="form-page">
      <SiteHeader variant="form" />
      <main className="form-main">
        <div className="shell form-layout">
          <aside className="form-intro">
            <p className="eyebrow">{t("form.eyebrow")}</p>
            <h1>{t("form.title")}</h1>
            <p>{t("form.intro")}</p>
            <div className="form-aside-note">
              <span>✦</span>
              <p>{t("form.privacy")}</p>
            </div>
            <Link className="text-link" href="/#locations">
              {t("form.locations")}
            </Link>
          </aside>
          <section className="form-panel" aria-labelledby="form-heading">
            <div className="form-panel-heading">
              <p className="form-step">{t("form.step")}</p>
              <h2 id="form-heading">{t("form.heading")}</h2>
              <p>{t("form.required")}</p>
            </div>
            <AppointmentForm />
          </section>
        </div>
      </main>
      <SiteFooter variant="form" />
    </div>
  );
}
