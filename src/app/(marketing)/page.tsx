import { Hero } from "@/components/landing/hero";
import { Universities } from "@/components/landing/universities";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Testimonials } from "@/components/landing/testimonials";
import { CTA } from "@/components/landing/cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Universities />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CTA />
    </>
  );
}
