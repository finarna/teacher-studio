import LandingNav from './LandingNav';
import HeroSection from './HeroSection';
import VerificationAuditSection from './VerificationAuditSection';
import SubjectMasterySection from './SubjectMasterySection';
import FeaturesSection from './FeaturesSection';
import AdaptiveTrajectorySection from './AdaptiveTrajectorySection';
import CoreCapabilitiesSection from './CoreCapabilitiesSection';
import PricingSection from './PricingSection';
import TestimonialsSection from './TestimonialsSection';
import FAQSection from './FAQSection';
import LandingFooter from './LandingFooter';
import RankStreamBackground from './RankStreamBackground';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white relative">
      <RankStreamBackground />
      <LandingNav onGetStarted={onGetStarted} />
      <main className="relative z-10">
        <HeroSection onGetStarted={onGetStarted} />
        <SubjectMasterySection />
        <AdaptiveTrajectorySection />
        <CoreCapabilitiesSection />
        <FeaturesSection />
        <PricingSection onGetStarted={onGetStarted} />
        <TestimonialsSection />
        <FAQSection />
      </main>
      <LandingFooter />
    </div>
  );
}
