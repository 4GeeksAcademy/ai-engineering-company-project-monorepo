export const clinics = [
  {
    name: "HealthCore Austin Central",
    city: "Austin",
    state: "TX",
    phone: "(512) 340-8800",
    hours: "Mon–Fri 7am–8pm · Sat 9am–3pm",
    closingHour: 20,
  },
  {
    name: "HealthCore Austin North",
    city: "Austin",
    state: "TX",
    phone: "(512) 340-8810",
    hours: "Mon–Fri 8am–7pm",
    closingHour: 19,
  },
  {
    name: "HealthCore San Antonio",
    city: "San Antonio",
    state: "TX",
    phone: "(210) 720-4400",
    hours: "Mon–Fri 8am–6pm · Sat 9am–1pm",
    closingHour: 18,
  },
  {
    name: "HealthCore Miami",
    city: "Miami",
    state: "FL",
    phone: "(305) 510-7700",
    hours: "Mon–Fri 7am–8pm · Sat 9am–4pm",
    closingHour: 20,
  },
  {
    name: "HealthCore Orlando",
    city: "Orlando",
    state: "FL",
    phone: "(407) 892-6600",
    hours: "Mon–Fri 8am–6pm",
    closingHour: 18,
  },
  {
    name: "HealthCore Atlanta",
    city: "Atlanta",
    state: "GA",
    phone: "(404) 330-9900",
    hours: "Mon–Fri 8am–7pm",
    closingHour: 19,
  },
] as const;

export const clinicClosingHour: Record<string, number> = Object.fromEntries(
  clinics.map((c) => [c.name, c.closingHour])
);

export const schemaOrganization = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "MedicalOrganization",
      "@id": "https://www.healthcore.com/#organization",
      name: "HealthCore",
      description:
        "Outpatient healthcare network offering primary care, specialist consultations, chronic disease management, and preventive health programmes.",
      url: "https://www.healthcore.com",
      foundingDate: "2011",
      logo: "https://www.healthcore.com/logo.png",
      availableLanguage: ["English", "Spanish"],
      areaServed: ["US", "GB"],
      address: {
        "@type": "PostalAddress",
        addressLocality: "Austin",
        addressRegion: "Texas",
        addressCountry: "US",
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+1-512-340-8800",
        contactType: "patient services",
        availableLanguage: ["English", "Spanish"],
      },
      sameAs: [
        "https://linkedin.com/company/healthcore",
        "https://facebook.com/healthcore",
        "https://instagram.com/healthcore",
      ],
    },
    ...clinics.map((clinic) => ({
      "@type": "MedicalClinic",
      name: clinic.name,
      telephone: clinic.phone.replace(/[^\d+]/g, "").replace(/^(\d)/, "+1-$1"),
      openingHours: clinic.hours.replace(/·/g, ","),
      parentOrganization: { "@id": "https://www.healthcore.com/#organization" },
    })),
  ],
};
