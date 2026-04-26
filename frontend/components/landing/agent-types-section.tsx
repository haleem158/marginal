"use client";
import { motion } from "framer-motion";

const agentTypes = [
  {
    name: "Auctioneer",
    color: "#A78BFA",
    description: "Receives tasks. Estimates compute. Runs the auction.",
    status: "Active",
    statusColor: "#00FF88",
    icon: "⚡",
  },
  {
    name: "Executor",
    color: "#00C2FF",
    description: "Bids for tasks. Runs inference. Returns outputs.",
    status: "Active",
    statusColor: "#00FF88",
    icon: "🤖",
  },
  {
    name: "Auditor",
    color: "#F59E0B",
    description: "Scores output quality vs compute consumed.",
    status: "Monitoring",
    statusColor: "#FFB800",
    icon: "🔍",
  },
  {
    name: "Treasury",
    color: "#10B981",
    description: "Reads scores. Distributes rewards. Slashes losers.",
    status: "Active",
    statusColor: "#00FF88",
    icon: "💎",
  },
  {
    name: "Memory Indexer",
    color: "#EC4899",
    description: "Writes all history to 0G Storage permanently.",
    status: "Active",
    statusColor: "#00FF88",
    icon: "🗃️",
  },
];

export function AgentTypesSection() {
  return (
    <section id="agents" className="py-28 px-6 bg-[#080808]/80">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-mono uppercase tracking-widest text-[#00C2FF] mb-3 block">
              Agent Network
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#F5F5F5] tracking-tight">
              Five Agent Types
            </h2>
            <p className="mt-4 text-[#888888] text-base max-w-xl mx-auto">
              Each agent role is specialized. Together they form a self-sustaining compute economy.
            </p>
          </motion.div>
        </div>

        <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 scrollbar-hide md:grid md:grid-cols-5">
          {agentTypes.map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="relative shrink-0 w-56 md:w-auto p-5 rounded-xl bg-white/2 border border-white/6 hover:border-white/10 transition-all duration-200 overflow-hidden"
              style={{ borderTop: `2px solid ${agent.color}` }}
            >
              {/* Subtle top glow */}
              <div
                className="absolute top-0 left-0 right-0 h-16 opacity-20"
                style={{ background: `linear-gradient(to bottom, ${agent.color}15, transparent)` }}
              />

              <div className="relative">
                <div className="text-2xl mb-3">{agent.icon}</div>
                <h3 className="font-semibold text-sm text-[#F5F5F5] mb-1.5">{agent.name}</h3>
                <p className="text-xs text-[#888888] leading-relaxed mb-4">{agent.description}</p>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: agent.statusColor }}
                  />
                  <span className="text-[11px] font-mono" style={{ color: agent.statusColor }}>
                    {agent.status}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
