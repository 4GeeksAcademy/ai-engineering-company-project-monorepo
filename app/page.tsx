import SkipLink from "@/components/SkipLink";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import OurStory from "@/components/OurStory";
import UniqueSection from "@/components/UniqueSection";
import LocationsSection from "@/components/LocationsSection";
import BrasaPointsSection from "@/components/BrasaPointsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <SkipLink />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(205,88,38,0.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(155,36,18,0.14),transparent_40%),linear-gradient(180deg,#f8f3e9_0%,#efe4d2_45%,#f4efe6_100%)]" />
      <Header />
      <main id="main-content">
        <HeroSection />
        <OurStory />
        <UniqueSection />
        <LocationsSection />
        <BrasaPointsSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
