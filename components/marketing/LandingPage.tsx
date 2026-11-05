import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import Templates from "@/components/landing/Templates";
import StepsToShare from "@/components/landing/StepsToShare";
import FinalCTA from "@/components/landing/FinalCTA";

export default function LandingPage() {
  return (
    <div className="relative">
      <Hero />
      <HowItWorks />
      <FeaturesGrid />
      <Templates />
      <StepsToShare />
      <FinalCTA />
    </div>
  );
}
