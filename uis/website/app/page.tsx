"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import Header from "../components/Header";

const services = [
  {
    title: "Executive Headhunting",
    image: "/assets/bphoto2.jpg",
    imageAlt: "Executive Headhunting",
    points: [
      "Search and selection of executive and mid-management profiles",
      "Personalized process with replacement guarantee",
    ],
  },
  {
    title: "Customer Support Outsourcing",
    image: "/assets/bphoto3.jpg",
    imageAlt: "Customer Support Outsourcing",
    points: [
      "Specialized teams for technology companies",
      "Continuous training and dedicated supervision",
    ],
  },
  {
    title: "Corporate Training",
    image: "/assets/bphoto4.jpg",
    imageAlt: "Corporate Training",
    points: [
      "Soft skills and leadership programs",
      "In-person and online courses adapted to each organization",
    ],
  },
];

const whyNexova = [
  {
    label: "12 years of experience",
    text: "in the Latin American market",
  },
  {
    label: "Regional presence:",
    text: "Spain and United States",
  },
  {
    label: "+500 successful selection processes",
    text: "completed",
  },
  {
    label: "Sector specialization",
    text: "in technology, retail, and finance",
  },
];

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Nexova",
  description: "Human resources consulting and talent acquisition",
  url: "https://nexova.com",
  foundingDate: "2011",
  address: [
    {
      "@type": "PostalAddress",
      addressCountry: "ES",
      addressLocality: "Valencia",
      addressRegion: "Comunidad Valenciana",
    },
    {
      "@type": "PostalAddress",
      addressCountry: "US",
      addressLocality: "Miami",
      addressRegion: "Florida",
    },
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+34-960-123-456",
    contactType: "customer service",
    availableLanguage: ["Spanish", "English"],
  },
  sameAs: [
    "https://linkedin.com/company/nexova",
    "https://instagram.com/nexova",
  ],
};

export default function Home() {
  useEffect(() => {
    const revealItems = document.querySelectorAll<HTMLElement>("[data-reveal]");

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      revealItems.forEach((item) => {
        item.classList.add("is-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    revealItems.forEach((item) => {
      observer.observe(item);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Header />

      <main>
        <section
          id="home"
          className="hero-motion relative isolate overflow-hidden"
          style={{
            backgroundImage: "url('/assets/bphoto1.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-label="Hero section"
        >
          <div className="absolute inset-0 bg-rose-950/45" aria-hidden="true" />
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 md:py-32 lg:py-40">
            <div className="max-w-3xl">
              <h1 className="rise-in mb-4 text-center text-3xl leading-tight font-extrabold text-white sm:text-left sm:text-4xl md:text-5xl">
                We build exceptional teams for growing companies
              </h1>
              <p className="rise-in rise-in-delay-1 mb-8 text-center text-base text-slate-100 sm:text-left sm:text-lg md:text-xl">
                Human resources consulting and talent acquisition firm with over 10 years helping technology, retail, and financial services companies find and develop the best talent.
              </p>
              <div className="flex justify-center sm:justify-start">
                <Link
                  href="/application"
                  className="cta-pulse inline-block rounded-lg bg-rose-500 px-6 py-3 font-semibold text-white shadow transition hover:bg-rose-400"
                >
                  Join our talent pool
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="services"
          className="reveal-on-scroll mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16"
          data-reveal
        >
          <h2 className="mb-8 text-center text-3xl font-bold text-orange-950 md:mb-10">
            Our Services
          </h2>
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {services.map((service) => (
              <article
                key={service.title}
                className="service-card flex flex-col items-center rounded-lg border border-orange-200 bg-white/80 p-5 text-center shadow backdrop-blur-sm sm:p-6"
              >
                <Image
                  src={service.image}
                  alt={service.imageAlt}
                  width={800}
                  height={400}
                  className="service-image mb-4 h-40 w-full rounded-md object-cover"
                />
                <h3 className="mb-2 text-xl font-semibold text-orange-900">{service.title}</h3>
                <ul className="text-orange-800">
                  {service.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section
          id="why"
          className="reveal-on-scroll mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-stretch md:gap-10 md:py-16"
          data-reveal
        >
          <div className="flex w-full flex-col md:w-1/2">
            <h2 className="mb-5 text-3xl font-bold text-orange-950 md:mb-6 md:text-4xl">
              Why Nexova?
            </h2>
            <ul className="flex flex-1 flex-col justify-around space-y-3 text-lg leading-relaxed text-orange-900 md:space-y-0 md:text-2xl">
              {whyNexova.map((point) => (
                <li key={point.label}>
                  <strong>{point.label}</strong> {point.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full md:w-1/2">
            <Image
              src="/assets/bphoto5.jpg"
              alt="Nexova experience"
              width={1000}
              height={900}
              className="why-image h-full w-full rounded-lg object-cover shadow-lg"
            />
          </div>
        </section>

        <section id="contact" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <h2 className="mb-8 text-center text-3xl font-bold text-orange-950">Contact</h2>
          <div className="flex flex-col items-center justify-center gap-10 md:flex-row">
            <div className="flex items-center gap-4 text-orange-900">
              <span aria-hidden="true" className="text-xl">
                Email:
              </span>
              <a href="mailto:contacto@nexova.com" className="text-lg text-rose-600 hover:underline">
                contacto@nexova.com
              </a>
            </div>
            <div className="flex items-center gap-4 text-orange-900">
              <span aria-hidden="true" className="text-xl">
                Valencia, Spain:
              </span>
              <span className="text-lg">+34 960 123 456</span>
            </div>
            <div className="flex items-center gap-4 text-orange-900">
              <span aria-hidden="true" className="text-xl">
                Miami, USA:
              </span>
              <span className="text-lg">+1 305 555 0191</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-10 w-full border-t border-orange-300/40 bg-gradient-to-r from-rose-500 to-orange-500 py-6 text-orange-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between px-4 text-center sm:px-6 md:flex-row md:text-left">
          <span className="text-sm sm:text-base">© 2025 Nexova. All rights reserved.</span>
          <div className="mt-4 flex space-x-6 text-amber-100 md:mt-0">
            <a
              href="https://linkedin.com/company/nexova"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              LinkedIn
            </a>
            <a
              href="https://instagram.com/nexova"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
