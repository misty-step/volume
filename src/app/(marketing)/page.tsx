import {
  Benefits,
  FAQ,
  FinalCTA,
  Footer,
  Hero,
  HowItWorks,
  Navbar,
  ScreensCarousel,
  SocialProof,
} from "@/components/marketing";

export default function MarketingHome() {
  return (
    <div className="bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <Benefits />
        <HowItWorks />
        <ScreensCarousel />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
