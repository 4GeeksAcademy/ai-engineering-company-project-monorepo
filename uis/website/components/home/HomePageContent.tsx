import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ContactSection } from "@/components/home/ContactSection";
import { HeroSection } from "@/components/home/HeroSection";
import { LocationsTable } from "@/components/home/LocationsTable";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { WhyHealthCore } from "@/components/home/WhyHealthCore";
import { schemaOrganization } from "@/lib/content";

export function HomePageContent() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrganization) }}
      />
      <SiteHeader />
      <main id="home">
        <HeroSection />
        <ServicesGrid />
        <WhyHealthCore />
        <LocationsTable />
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  );
}
