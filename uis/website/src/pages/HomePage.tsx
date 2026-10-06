import { BrandPillars } from "../components/BrandPillars";
import { Hero } from "../components/Hero";
import { LoyaltyTeaser } from "../components/LoyaltyTeaser";
import { Markets } from "../components/Markets";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <Hero />
        <BrandPillars />
        <Markets />
        <LoyaltyTeaser />
      </main>
      <SiteFooter />
    </>
  );
}
