import { HomePage } from "@/components/home-page";
import { clinics } from "@/lib/clinics";

const parentOrganization = { "@type": "MedicalOrganization", name: "HealthCore" };

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalOrganization",
  name: "HealthCore",
  description:
    "Outpatient healthcare network offering primary care, specialist consultations, chronic disease management, and preventive health programmes.",
  url: "https://www.healthcore.com",
  foundingDate: "2011",
  logo: "https://www.healthcore.com/logo.png",
  availableLanguage: ["English", "Spanish"],
  areaServed: ["US", "GB"],
  address: { "@type": "PostalAddress", addressLocality: "Austin", addressRegion: "Texas", addressCountry: "US" },
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
};

const clinicsJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: clinics.map((clinic) => ({
    "@type": "MedicalClinic",
    name: clinic.name,
    telephone: clinic.phone,
    openingHours: clinic.openingHours,
    parentOrganization,
  })),
};

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default function Home() {
  return (
    <>
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={clinicsJsonLd} />
      <HomePage />
    </>
  );
}
