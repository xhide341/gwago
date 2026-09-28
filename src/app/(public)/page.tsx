import { HeroSection } from "@/components/home/hero-section";
import { FeaturedProductsSection } from "@/components/home/featured-products-section";
import { DiscountSection } from "@/components/home/discount-section";
import { CredibilitySection } from "@/components/home/credibility-section";
import { CtaSection } from "@/components/home/cta-section";
import { FooterSection } from "@/components/footer-section";

export default function HomePage() {
  return (
    <main className="bg-background min-h-svh py-2">
      <HeroSection />
      <FeaturedProductsSection />
      <DiscountSection />
      <CredibilitySection />
      <CtaSection />
      <FooterSection />
    </main>
  );
}
