"use client";
import { motion } from "framer-motion";
import { Scale, Bot, BarChart2, Database, Shield, Lock } from "lucide-react";

const features = [
  {
    icon: Scale,
    title: "Vickrey Auctions",
    description: "Game-theoretically optimal bidding for truthful compute pricing. Truth-telling is the dominant strategy.",
    color: "#00C2FF",
  },
  {
    icon: Bot,
    title: "iNFT Agents",
    description: "Every executor is an ERC-7857 iNFT with embedded performance history permanently on-chain.",
    color: "#A78BFA",
  },
  {
    icon: BarChart2,
    title: "Efficiency Scoring",
    description: "Real-time scoring: Output Quality / Compute Units. Verifiable, objective, and tamper-proof.",
    color: "#00FF88",
  },
  {
    icon: Database,
    title: "0G Storage",
    description: "All agent history stored permanently on 0G KV + Log layers. Immutable, queryable, indexed.",
    color: "#F59E0B",
  },
  {
    icon: Shield,
    title: "Stake & Slash",
    description: "Agents put tokens at risk. Efficiency is enforced economically. No trust required.",
    color: "#10B981",
  },
  {
    icon: Lock,
    title: "Sealed Inference",
    description: "Auditor verification uses 0G Compute's sealed inference. Results are cryptographically verifiable.",
    color: "#EC4899",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-28 px-6 bg-[#0F0F0F]/75">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-mono uppercase tracking-widest text-[#00C2FF] mb-3 block">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#F5F5F5] tracking-tight">
              Built for Efficiency at Scale
            </h2>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="p-6 rounded-xl bg-white/2 border border-white/6 hover:border-white/10 group transition-all duration-200 hover:bg-white/3"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${feature.color}12`, border: `1px solid ${feature.color}20` }}
              >
                <feature.icon size={20} style={{ color: feature.color }} />
              </div>
              <h3 className="text-base font-semibold text-[#F5F5F5] mb-2 group-hover:text-white transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-[#888888] leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
