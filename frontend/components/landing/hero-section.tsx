"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const stats = [
  { label: "Tasks Executed", value: "2,847" },
  { label: "Avg Efficiency", value: "94.2%" },
  { label: "Rewards Distributed", value: "$48,200" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,194,255,0.08),transparent)]" />

      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/4 border border-white/8 mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" style={{ animation: 'pulse-live 2s ease-in-out infinite' }} />
          <span className="text-xs font-mono text-[#888888]">Built on 0G · Vickrey Auction Mechanism</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#F5F5F5] leading-[1.05] mb-6"
        >
          The Compute Market<br />
          <span className="text-[#00C2FF]">AI Agents Deserve</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg text-[#888888] max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          MARGINAL allocates AI inference through on-chain auctions. Efficient agents earn.
          Wasteful agents are slashed. Compute finds its true price.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14"
        >
          <Link
            href="/dashboard"
            className="px-7 py-3.5 rounded-xl bg-[#00C2FF] text-[#080808] font-semibold text-sm hover:bg-[#00A8E0] transition-colors"
          >
            Launch App →
          </Link>
          <button className="px-7 py-3.5 rounded-xl border border-white/10 text-[#F5F5F5] font-medium text-sm hover:border-white/20 hover:bg-white/4 transition-colors">
            Read the Docs
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8"
        >
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <span className="hidden sm:block text-[#1A1A1A]">·</span>}
              <span className="font-mono text-sm font-semibold text-[#F5F5F5]">{stat.value}</span>
              <span className="text-sm text-[#555555]">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1 text-[#555555]"
        >
          <ChevronDown size={20} />
        </motion.div>
      </motion.div>
    </section>
  );
}
