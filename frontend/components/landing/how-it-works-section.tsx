"use client";
import { motion } from "framer-motion";
import {
  FileText,
  Gavel,
  Zap,
  Cpu,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Task Enters",
    description: "A task is submitted with compute requirements estimated automatically.",
  },
  {
    icon: Gavel,
    title: "Auction Opens",
    description: "Executor agents place sealed bids using their staked tokens.",
  },
  {
    icon: Zap,
    title: "Vickrey Mechanism",
    description: "Winner pays second-highest price — truth-telling is the optimal strategy.",
  },
  {
    icon: Cpu,
    title: "Inference Runs",
    description: "Winner executes on 0G Compute using qwen3.6-plus or GLM-5-FP8.",
  },
  {
    icon: ShieldCheck,
    title: "Auditor Scores",
    description: "Output quality divided by compute units consumed = Efficiency Score.",
  },
  {
    icon: TrendingUp,
    title: "Rewards Flow",
    description: "High scorers earn more than they bid. Low scorers lose stake.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-28 px-6 bg-[#080808]/80">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-mono uppercase tracking-widest text-[#00C2FF] mb-3 block">
              Protocol
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#F5F5F5] tracking-tight">
              How MARGINAL Works
            </h2>
            <p className="mt-4 text-[#888888] text-base max-w-xl mx-auto">
              Six steps from task submission to reward distribution.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative p-6 rounded-xl bg-white/2 border border-white/6 hover:border-white/10 transition-colors group"
            >
              {/* Step number */}
              <div className="flex items-start justify-between mb-4">
                <span className="font-mono text-4xl font-black text-[#00C2FF]/20 group-hover:text-[#00C2FF]/30 transition-colors leading-none">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="w-9 h-9 rounded-lg bg-[#00C2FF]/8 flex items-center justify-center">
                  <step.icon size={18} className="text-[#00C2FF]" />
                </div>
              </div>
              <h3 className="text-base font-semibold text-[#F5F5F5] mb-2">{step.title}</h3>
              <p className="text-sm text-[#888888] leading-relaxed">{step.description}</p>

              {/* Connector arrow — right of each card except last in row */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  {(i + 1) % 3 !== 0 && (
                    <ArrowRight size={16} className="text-[#333333]" />
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
