"use client";

import { NavHeader } from "@/components/landing/nav-header";
import { HeroSection } from "@/components/landing/hero-section";
import { StatsTicker } from "@/components/landing/stats-ticker";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { AgentTypesSection } from "@/components/landing/agent-types-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return (
    <div className="relative flex flex-col bg-transparent text-[#F5F5F5]">
      <NavHeader />

      {/* Offset for fixed nav */}
      <div className="pt-16">
        <HeroSection />
        <StatsTicker />
        <HowItWorksSection />
        <FeaturesSection />

        {/* Tagline callout */}
        <section className="py-32 px-6 bg-[#0F0F0F]/75 text-center">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-mono uppercase tracking-widest text-[#555555] mb-6">
              The Signal
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#F5F5F5] leading-tight mb-4">
              Compute is Scarce.
            </h2>
            <p className="text-2xl md:text-3xl font-light text-[#888888] italic">
              Efficiency is the only thing that matters.
            </p>
          </div>
        </section>

        <AgentTypesSection />
        <LandingFooter />
      </div>
    </div>
  );
}

