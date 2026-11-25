import Hero from "@/components/landing/Hero";
import YouTubeImportShowcase from "@/components/landing/YouTubeImportShowcase";
import HowItWorks from "@/components/landing/HowItWorks";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import Templates from "@/components/landing/Templates";
import StepsToShare from "@/components/landing/StepsToShare";
import FinalCTA from "@/components/landing/FinalCTA";
import Testimonials from "@/components/shadcn-studio/blocks/testimonials-component-01/testimonials-component-01";
import { TESTIMONIALS } from "@/constants/testimonials";

export default function LandingPage() {
  return (
    <div className="relative">
      <Hero />
      <YouTubeImportShowcase />
      <HowItWorks />
      <FeaturesGrid />
      <Templates />
      <StepsToShare />
      <FinalCTA />
      <Testimonials testimonials={TESTIMONIALS} />
    </div>
  );
}
