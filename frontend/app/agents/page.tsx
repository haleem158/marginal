"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { mockAgents, AgentType, AgentStatus } from "@/lib/mock-data";
import { ScoreBadge } from "@/components/shared/score-badge";
import { AgentTypeBadge } from "@/components/shared/agent-type-badge";
import { AddressChip } from "@/components/shared/address-chip";
import { cn } from "@/lib/utils";

const agentTypes = ["All", "executor", "auctioneer", "auditor", "treasury", "memory"];
const sortOptions = ["Efficiency Score", "Tasks Completed", "Stake"];

const statusStyles: Record<AgentStatus, { label: string; color: string; bg: string }> = {
  active:   { label: "Active",   color: "#00FF88", bg: "rgba(0,255,136,0.10)" },
  cooldown: { label: "Cooldown", color: "#FFB800", bg: "rgba(255,184,0,0.10)" },
  slashed:  { label: "Slashed",  color: "#FF4455", bg: "rgba(255,68,85,0.10)" },
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 0.8 ? "#00FF88" : score >= 0.5 ? "#FFB800" : "#FF4455";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score * 100}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-xs tabular-nums" style={{ color }}>{score.toFixed(2)}</span>
    </div>
  );
}

export default function AgentsPage() {
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Efficiency Score");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const filtered = mockAgents
    .filter((a) => typeFilter === "All" || a.type === typeFilter)
    .filter((a) => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.id.includes(search))
    .sort((a, b) => {
      if (sortBy === "Efficiency Score") return b.score - a.score;
      if (sortBy === "Tasks Completed") return b.tasks - a.tasks;
      if (sortBy === "Stake") return b.stake - a.stake;
      return 0;
    });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const topScorers = [...mockAgents].sort((a, b) => b.score - a.score).slice(0, 3).map((a) => a.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-[#F5F5F5]">Agent Registry</h2>
        <Link
          href="/agents/register"
          className="px-4 py-2 rounded-lg bg-[#00C2FF] text-[#080808] text-sm font-semibold hover:bg-[#00A8E0] transition-colors"
        >
          + Register Agent
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/4 border border-white/8 text-sm text-[#F5F5F5] outline-none"
        >
          {agentTypes.map((t) => (
            <option key={t} value={t} className="bg-[#141414]">
              {t === "All" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/4 border border-white/8 text-sm text-[#F5F5F5] outline-none"
        >
          {sortOptions.map((s) => (
            <option key={s} value={s} className="bg-[#141414]">{s}</option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by address or name..."
          className="flex-1 min-w-48 px-3 py-2 rounded-lg bg-white/4 border border-white/8 text-sm text-[#F5F5F5] placeholder:text-[#333333] outline-none focus:border-[#00C2FF]/40"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/6 overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_140px_80px_120px_90px_100px_80px] text-[10px] uppercase tracking-wider text-[#555555] px-4 py-2.5 border-b border-white/6 bg-white/1 font-mono">
          <span>Agent</span>
          <span>Type</span>
          <span>Efficiency</span>
          <span>Tasks</span>
          <span>Stake</span>
          <span>Status</span>
          <span>Last Active</span>
          <span />
        </div>

        {paginated.map((agent) => {
          const st = statusStyles[agent.status];
          const isTop3 = topScorers.includes(agent.id);
          return (
            <div
              key={agent.id}
              className={cn(
                "grid grid-cols-[1fr_120px_140px_80px_120px_90px_100px_80px] px-4 py-3.5 border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors items-center",
                agent.status === "slashed" && "border-l-2 border-l-[#FF4455]"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#00C2FF]/10 border border-[#00C2FF]/20 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-mono font-bold text-[#00C2FF]">
                    {agent.id.slice(2, 4).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-[#F5F5F5] truncate">{agent.name}</span>
                    {isTop3 && <span title="Top 3 agent">🏆</span>}
                  </div>
                  <AddressChip address={agent.id} showCopy className="mt-0.5" />
                </div>
              </div>
              <div><AgentTypeBadge type={agent.type as AgentType} /></div>
              <div><ScoreBar score={agent.score} /></div>
              <div className="font-mono text-sm text-[#F5F5F5]">{agent.tasks.toLocaleString()}</div>
              <div className="font-mono text-sm text-[#F5F5F5]">
                {agent.stake.toLocaleString()}{" "}
                <span className="text-[10px] text-[#555555]">$MARG</span>
              </div>
              <div>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase"
                  style={{ color: st.color, background: st.bg }}
                >
                  {st.label}
                </span>
              </div>
              <div className="font-mono text-xs text-[#555555]">{agent.lastActive}</div>
              <Link
                href={`/agents/${encodeURIComponent(agent.id)}`}
                className="px-3 py-1.5 rounded-lg bg-white/4 border border-white/8 text-xs text-[#888888] hover:text-[#F5F5F5] hover:border-white/12 transition-colors text-center"
              >
                View
              </Link>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-mono transition-colors",
                p === page
                  ? "bg-[#00C2FF]/15 text-[#00C2FF]"
                  : "text-[#555555] hover:text-[#F5F5F5] hover:bg-white/4"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
