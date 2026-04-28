import os

BASE = r'c:\Users\DELL\OneDrive\Documents\Marginal\frontend'

def write(rel, content):
    path = os.path.join(BASE, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'OK: {rel}')

# ──────────────────────────────────────────────────────────────
# app/auctions/page.tsx
# ──────────────────────────────────────────────────────────────
write('app/auctions/page.tsx', r'''"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AuctionCard } from "@/components/auctions/auction-card";
import { BidPanel } from "@/components/auctions/bid-panel";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { mockAuctions, Auction } from "@/lib/mock-data";

const models = ["All Models", "qwen3.6-plus", "GLM-5-FP8"];
const sorts  = ["Time Remaining", "Bid Count", "Compute Est."];

export default function AuctionsPage() {
  const [selectedModel, setSelectedModel] = useState("All Models");
  const [selectedSort,  setSelectedSort]  = useState("Time Remaining");
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);

  const filtered = mockAuctions
    .filter((a) => selectedModel === "All Models" || a.model === selectedModel)
    .sort((a, b) => {
      if (selectedSort === "Time Remaining") return a.timeRemaining - b.timeRemaining;
      if (selectedSort === "Bid Count") return b.bidCount - a.bidCount;
      return b.computeEst - a.computeEst;
    });

  const liveCount = mockAuctions.filter(
    (a) => a.status === "live" || a.status === "ending"
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 flex gap-6"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[#F5F5F5]">Live Auctions</h2>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00FF88]/8 border border-[#00FF88]/15 text-xs font-mono text-[#00FF88]">
              <LiveIndicator status="live" />
              {liveCount} active
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/4 border border-white/8 text-sm text-[#F5F5F5] outline-none"
            >
              {models.map((m) => (
                <option key={m} value={m} className="bg-[#141414]">{m}</option>
              ))}
            </select>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/4 border border-white/8 text-sm text-[#F5F5F5] outline-none"
            >
              {sorts.map((s) => (
                <option key={s} value={s} className="bg-[#141414]">{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              onBid={() => setSelectedAuction(auction)}
            />
          ))}
        </div>
      </div>
      <BidPanel auction={selectedAuction} onClose={() => setSelectedAuction(null)} />
    </motion.div>
  );
}
''')

# ──────────────────────────────────────────────────────────────
# app/agents/page.tsx
# ──────────────────────────────────────────────────────────────
write('app/agents/page.tsx', r'''"use client";

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
''')

# ──────────────────────────────────────────────────────────────
# app/agents/[id]/page.tsx
# ──────────────────────────────────────────────────────────────
write('app/agents/[id]/page.tsx', r'''"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { mockAgents, mockEfficiencyHistory, AgentType } from "@/lib/mock-data";
import { EfficiencyRing } from "@/components/shared/efficiency-ring";
import { AgentTypeBadge } from "@/components/shared/agent-type-badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { StatBlock } from "@/components/shared/stat-block";
import { cn } from "@/lib/utils";

const agent = mockAgents[0];

const taskHistory = mockEfficiencyHistory.map((h, i) => ({
  ...h,
  taskId: `48${String(i + 1).padStart(2, "0")}`,
  type: ["Summarization", "Code Gen", "Research", "Classification"][i % 4],
  model: i % 2 === 0 ? "qwen3.6-plus" : "GLM-5-FP8",
  bid: Math.round(80 + (i * 7) % 200),
  reward: h.score > 0.5 ? Math.round(h.score * 200) : -Math.round((0.5 - h.score) * 150),
}));

function ChartTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      <div className="text-[#555555]">Task #{d?.taskId}</div>
      <div className={d?.score >= 0.8 ? "text-[#00FF88]" : d?.score >= 0.5 ? "text-[#FFB800]" : "text-[#FF4455]"}>
        Score: {payload[0]?.value?.toFixed(3)}
      </div>
      <div className={d?.reward >= 0 ? "text-[#00FF88]" : "text-[#FF4455]"}>
        {d?.reward >= 0 ? "+" : ""}{d?.reward} $MARG
      </div>
    </div>
  );
}

export default function AgentProfilePage() {
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    navigator.clipboard.writeText(agent.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Left column */}
        <div className="space-y-5">
          <div className="p-6 rounded-xl bg-white/2 border border-white/6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-[#00C2FF]/10 border-2 border-[#00C2FF]/20 flex items-center justify-center mb-4">
                <span className="text-2xl font-mono font-black text-[#00C2FF]">
                  {agent.id.slice(2, 4).toUpperCase()}
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#F5F5F5] mb-1">{agent.name}</h2>
              <AgentTypeBadge type={agent.type as AgentType} size="md" />
            </div>

            <div className="mb-4">
              <div className="text-[10px] text-[#555555] uppercase tracking-wider mb-1.5">
                Agent Address
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs text-[#888888] bg-white/4 px-2.5 py-1.5 rounded-lg border border-white/6 truncate">
                  {agent.id}
                </code>
                <button
                  onClick={copyAddress}
                  className="p-1.5 rounded-lg bg-white/4 border border-white/8 text-[#555555] hover:text-[#F5F5F5] transition-colors"
                >
                  {copied ? <Check size={13} className="text-[#00FF88]" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div>
                <div className="text-[10px] text-[#555555] mb-1">Token ID</div>
                <span className="font-mono text-[#F5F5F5]">{agent.tokenId}</span>
              </div>
              <div>
                <div className="text-[10px] text-[#555555] mb-1">Minted</div>
                <span className="font-mono text-[#F5F5F5]">{agent.mintDate}</span>
              </div>
            </div>

            <p className="text-xs text-[#888888] leading-relaxed border-t border-white/6 pt-4">
              {agent.description}
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white/2 border border-white/6 space-y-4">
            <StatBlock label="Current Stake" value={`${agent.stake.toLocaleString()} $MARG`} />
            <StatBlock label="Total Earned" value={`${agent.earned.toLocaleString()} $MARG`} delta="lifetime" deltaPositive />
            <StatBlock label="Total Slashed" value={`${agent.slashed.toLocaleString()} $MARG`} delta="lifetime" deltaPositive={false} />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white/2 border border-white/6 flex flex-col items-center justify-center gap-2">
              <EfficiencyRing score={agent.score} size={72} animated />
              <span className="text-[10px] text-[#555555] uppercase tracking-wider">Efficiency</span>
            </div>
            <div className="p-5 rounded-xl bg-white/2 border border-white/6">
              <div className="text-[10px] text-[#555555] uppercase tracking-wider mb-2">Win Rate</div>
              <div className="font-mono text-lg font-bold text-[#F5F5F5]">{agent.tasks}</div>
              <div className="text-xs text-[#555555] mt-1">tasks won</div>
              <div className="w-full h-1.5 rounded-full bg-white/8 mt-2">
                <div className="h-full rounded-full bg-[#00C2FF]" style={{ width: "72%" }} />
              </div>
            </div>
            <div className="p-5 rounded-xl bg-white/2 border border-white/6">
              <div className="text-[10px] text-[#555555] uppercase tracking-wider mb-2">Compute Used</div>
              <div className="font-mono text-lg font-bold text-[#F5F5F5]">2.4M</div>
              <div className="text-xs text-[#555555] mt-1">total tokens</div>
            </div>
            <div className="p-5 rounded-xl bg-white/2 border border-white/6">
              <div className="text-[10px] text-[#555555] uppercase tracking-wider mb-2">Epoch Rank</div>
              <div className="font-mono text-lg font-bold text-[#F5F5F5]">#1</div>
              <div className="text-xs text-[#555555] mt-1">of 847 agents</div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white/2 border border-white/6">
            <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4">
              Efficiency History — Last 50 Tasks
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={taskHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="task"
                  tick={{ fill: "#555555", fontSize: 9, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  interval={9}
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fill: "#555555", fontSize: 9, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)" }} />
                <ReferenceLine y={0.8} stroke="#00FF88" strokeDasharray="4 4" strokeOpacity={0.4} />
                <ReferenceLine y={0.5} stroke="#FF4455" strokeDasharray="4 4" strokeOpacity={0.4} />
                <Line type="monotone" dataKey="score" stroke="#00C2FF" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-white/6 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/6">
              <h3 className="text-sm font-semibold text-[#F5F5F5]">Task History</h3>
            </div>
            <div className="grid grid-cols-[60px_1fr_1fr_100px_80px_100px] text-[10px] uppercase tracking-wider text-[#555555] px-4 py-2.5 border-b border-white/6 bg-white/1 font-mono">
              <span>Task</span>
              <span>Type</span>
              <span>Model</span>
              <span>Score</span>
              <span>Bid</span>
              <span>Reward</span>
            </div>
            {taskHistory.slice(0, 10).map((t) => (
              <div
                key={t.taskId}
                className="grid grid-cols-[60px_1fr_1fr_100px_80px_100px] px-4 py-3 border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors items-center text-sm"
              >
                <span className="font-mono text-[#F5F5F5]">#{t.taskId}</span>
                <span className="text-[#888888]">{t.type}</span>
                <code className="text-xs font-mono text-[#555555]">{t.model}</code>
                <div><ScoreBadge score={t.score} /></div>
                <span className="font-mono text-[#888888]">{t.bid}</span>
                <span className={cn("font-mono font-medium", t.reward >= 0 ? "text-[#00FF88]" : "text-[#FF4455]")}>
                  {t.reward >= 0 ? "+" : ""}{t.reward}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
''')

# ──────────────────────────────────────────────────────────────
# app/tasks/page.tsx
# ──────────────────────────────────────────────────────────────
write('app/tasks/page.tsx', r'''"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SubmitState = "idle" | "estimating" | "opening" | "done";

const stateMessages: Record<SubmitState, string> = {
  idle:       "Open Auction →",
  estimating: "Estimating compute...",
  opening:    "Opening auction...",
  done:       "Auction Created!",
};

const recentTasks = [
  { id: "4821", status: "live",   agent: "0x7f3a...c291", score: 0.94, cost: 142, time: "2m ago" },
  { id: "4815", status: "scored", agent: "0xf7b5...d2e8", score: 0.88, cost: 94,  time: "15m ago" },
  { id: "4809", status: "slashed",agent: "0x2e8c...4f17", score: 0.45, cost: 47,  time: "1h ago" },
];

export default function TasksPage() {
  const [task,         setTask]         = useState("");
  const [model,        setModel]        = useState<"qwen3.6-plus" | "GLM-5-FP8">("qwen3.6-plus");
  const [budget,       setBudget]       = useState("5000");
  const [reserveOpen,  setReserveOpen]  = useState(false);
  const [reserve,      setReserve]      = useState("0.70");
  const [submitState,  setSubmitState]  = useState<SubmitState>("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const estimatedTokens = Math.round(task.length * 1.3);
  const estimatedCost   = Math.round(estimatedTokens * 0.034);

  function autoResize() {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }

  async function handleSubmit() {
    const steps: SubmitState[] = ["estimating", "opening", "done"];
    for (const step of steps) {
      setSubmitState(step);
      await new Promise((r) => setTimeout(r, step === "done" ? 600 : 1200));
    }
    setTimeout(() => setSubmitState("idle"), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 flex justify-center"
    >
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#F5F5F5]">Submit a Task</h2>
          <p className="text-[#888888] mt-2">
            Describe what you need. MARGINAL will estimate compute and open an auction.
          </p>
        </div>

        <div className="space-y-5">
          {/* Step 1 */}
          <div className="p-5 rounded-xl bg-white/2 border border-white/6">
            <label className="block text-xs text-[#555555] uppercase tracking-wider mb-3">
              Step 1 — What do you need done?
            </label>
            <textarea
              ref={textareaRef}
              value={task}
              onChange={(e) => { setTask(e.target.value); autoResize(); }}
              placeholder="Summarize this research paper and extract the key findings on compute efficiency..."
              rows={4}
              className="w-full bg-transparent text-sm text-[#F5F5F5] placeholder:text-[#333333] outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/6">
              <span className="text-[11px] font-mono text-[#555555]">{task.length} chars</span>
              <span className="text-[11px] font-mono text-[#555555]">
                ~{estimatedTokens.toLocaleString()} tokens
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-xl bg-white/2 border border-white/6">
            <label className="block text-xs text-[#555555] uppercase tracking-wider mb-3">
              Step 2 — Model Preference
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["qwen3.6-plus", "GLM-5-FP8"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    model === m
                      ? "border-[#00C2FF]/40 bg-[#00C2FF]/6"
                      : "border-white/8 bg-white/2 hover:border-white/12"
                  )}
                >
                  <code className={cn(
                    "text-sm font-mono font-semibold block mb-1",
                    model === m ? "text-[#00C2FF]" : "text-[#F5F5F5]"
                  )}>
                    {m}
                  </code>
                  <span className="text-xs text-[#555555]">
                    {m === "qwen3.6-plus"
                      ? "Best for reasoning & research"
                      : "Best for speed & classification"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-xl bg-white/2 border border-white/6">
            <label className="block text-xs text-[#555555] uppercase tracking-wider mb-3">
              Step 3 — Maximum Compute Budget
            </label>
            <div className="relative">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full pl-4 pr-20 py-3 rounded-lg bg-white/4 border border-white/8 text-sm font-mono text-[#F5F5F5] outline-none focus:border-[#00C2FF]/40"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-[#555555]">
                tokens
              </span>
            </div>
            <p className="text-xs font-mono text-[#555555] mt-2">
              Estimated cost at market rate:{" "}
              <span className="text-[#00C2FF]">{estimatedCost} $MARG</span>
            </p>
          </div>

          {/* Step 4 – collapsible */}
          <div className="rounded-xl border border-white/6 overflow-hidden">
            <button
              onClick={() => setReserveOpen(!reserveOpen)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm text-[#888888] hover:text-[#F5F5F5] transition-colors"
            >
              <span>
                Step 4 — Reserve Price{" "}
                <span className="text-[#555555] text-xs">(optional)</span>
              </span>
              <ChevronDown
                size={16}
                className={cn("transition-transform", reserveOpen && "rotate-180")}
              />
            </button>
            <AnimatePresence>
              {reserveOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-2">
                    <label className="text-xs text-[#555555]">
                      Minimum quality score to accept
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={reserve}
                      onChange={(e) => setReserve(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-white/4 border border-white/8 text-sm font-mono text-[#F5F5F5] outline-none focus:border-[#00C2FF]/40"
                    />
                    <p className="text-xs text-[#555555]">
                      If no agent achieves this score, you get a full refund.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!task || submitState !== "idle"}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold transition-all",
              submitState === "done"
                ? "bg-[#00FF88]/15 border border-[#00FF88]/30 text-[#00FF88]"
                : submitState !== "idle"
                ? "bg-[#00C2FF]/10 border border-[#00C2FF]/20 text-[#00C2FF]"
                : !task
                ? "bg-white/4 border border-white/8 text-[#555555] cursor-not-allowed"
                : "bg-[#00C2FF] text-[#080808] hover:bg-[#00A8E0]"
            )}
          >
            {submitState === "done" ? (
              <Check size={16} />
            ) : submitState !== "idle" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : null}
            {stateMessages[submitState]}
          </button>
        </div>

        {/* Recent tasks */}
        <div className="mt-10">
          <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4">Your Recent Tasks</h3>
          <div className="rounded-xl border border-white/6 overflow-hidden">
            {recentTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-4 px-4 py-3.5 border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors"
              >
                <span className="font-mono text-sm text-[#F5F5F5]">#{t.id}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono uppercase",
                  t.status === "live"    && "bg-[#00C2FF]/10 text-[#00C2FF]",
                  t.status === "scored"  && "bg-[#00FF88]/10 text-[#00FF88]",
                  t.status === "slashed" && "bg-[#FF4455]/10 text-[#FF4455]",
                )}>
                  {t.status}
                </span>
                <span className="font-mono text-xs text-[#555555] flex-1">{t.agent}</span>
                <span className={cn(
                  "font-mono text-xs",
                  t.score >= 0.8 ? "text-[#00FF88]" : t.score >= 0.5 ? "text-[#FFB800]" : "text-[#FF4455]"
                )}>
                  {t.score.toFixed(2)}
                </span>
                <span className="font-mono text-xs text-[#888888]">{t.cost} $MARG</span>
                <span className="font-mono text-xs text-[#555555]">{t.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
''')

# ──────────────────────────────────────────────────────────────
# app/history/page.tsx
# ──────────────────────────────────────────────────────────────
write('app/history/page.tsx', r'''"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, ChevronDown } from "lucide-react";
import { mockHistoryEvents, HistoryEvent } from "@/lib/mock-data";
import { ScoreBadge } from "@/components/shared/score-badge";
import { cn } from "@/lib/utils";

const tabs = ["All Events", "Auction Results", "Reward Events", "Slash Events"];

const tabFilters: Record<string, (e: HistoryEvent) => boolean> = {
  "All Events":      () => true,
  "Auction Results": (e) => e.type === "AUCTION_WON",
  "Reward Events":   (e) => e.type === "REWARD_PAID",
  "Slash Events":    (e) => e.type === "AGENT_SLASHED",
};

const eventStyles: Record<string, { label: string; color: string; bg: string; accent: string }> = {
  AUCTION_WON:    { label: "AUCTION WON", color: "#00C2FF", bg: "rgba(0,194,255,0.08)",  accent: "" },
  REWARD_PAID:    { label: "REWARD",      color: "#00FF88", bg: "rgba(0,255,136,0.08)",  accent: "border-l-2 border-l-[#00FF88]" },
  AGENT_SLASHED:  { label: "SLASHED",     color: "#FF4455", bg: "rgba(255,68,85,0.08)",  accent: "border-l-2 border-l-[#FF4455]" },
  TASK_SCORED:    { label: "SCORED",      color: "#F59E0B", bg: "rgba(245,158,11,0.08)", accent: "border-l-2 border-l-[#F59E0B]" },
  MEMORY_WRITTEN: { label: "STORED",      color: "#EC4899", bg: "rgba(236,72,153,0.08)", accent: "border-l-2 border-l-[#EC4899]" },
};

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState("All Events");
  const [expanded,  setExpanded]  = useState<number | null>(null);

  const filtered = mockHistoryEvents.filter(tabFilters[activeTab] ?? (() => true));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6"
    >
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/6 w-fit mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm transition-colors",
              activeTab === tab
                ? "bg-[#00C2FF]/15 text-[#00C2FF] font-medium"
                : "text-[#555555] hover:text-[#888888]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/6 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[140px_80px_140px_100px_100px_100px_100px_80px] text-[10px] uppercase tracking-wider text-[#555555] px-4 py-2.5 border-b border-white/6 bg-white/1 font-mono">
          <span>Event</span>
          <span>Task</span>
          <span>Agent</span>
          <span>Score</span>
          <span>Compute</span>
          <span>Amount</span>
          <span>Block</span>
          <span>Time</span>
        </div>

        {filtered.map((event) => {
          const st = eventStyles[event.type] ?? eventStyles.AUCTION_WON;
          const isExpanded = expanded === event.id;
          return (
            <div key={event.id} className={cn(st.accent)}>
              <button
                onClick={() => setExpanded(isExpanded ? null : event.id)}
                className="w-full grid grid-cols-[140px_80px_140px_100px_100px_100px_100px_80px] px-4 py-3.5 border-b border-white/4 hover:bg-white/2 transition-colors items-center text-left"
              >
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase w-fit"
                  style={{ color: st.color, background: st.bg }}
                >
                  {st.label}
                </span>
                <span className="font-mono text-sm text-[#F5F5F5]">#{event.taskId}</span>
                <span className="font-mono text-xs text-[#888888] truncate">{event.agent}</span>
                <div><ScoreBadge score={event.score} /></div>
                <span className="font-mono text-xs text-[#888888]">
                  {event.computeUsed.toLocaleString()}
                </span>
                <span className={cn(
                  "font-mono text-sm font-medium",
                  event.amount > 0 ? "text-[#00FF88]" : event.amount < 0 ? "text-[#FF4455]" : "text-[#555555]"
                )}>
                  {event.amount !== 0
                    ? `${event.amount > 0 ? "+" : ""}${event.amount}`
                    : "—"}
                </span>
                <span className="font-mono text-xs text-[#555555]">{event.block}</span>
                <span className="font-mono text-xs text-[#555555]">{event.time}</span>
              </button>

              {/* Expanded detail row */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-white/4"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-white/1">
                      {event.bidAmount !== undefined && (
                        <>
                          <div>
                            <div className="text-[10px] text-[#555555] mb-1">Bid Amount</div>
                            <div className="font-mono text-sm text-[#F5F5F5]">
                              {event.bidAmount} $MARG
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#555555] mb-1">Second Price</div>
                            <div className="font-mono text-sm text-[#F5F5F5]">
                              {event.secondPrice} $MARG
                            </div>
                          </div>
                        </>
                      )}
                      {event.storageKey && (
                        <div>
                          <div className="text-[10px] text-[#555555] mb-1">0G Storage Key</div>
                          <code className="font-mono text-xs text-[#EC4899]">
                            {event.storageKey}
                          </code>
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] text-[#555555] mb-1">Transaction</div>
                        <a
                          href={`https://scan.0g.ai/tx/${event.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-[#00C2FF] hover:underline"
                        >
                          {event.txHash.slice(0, 14)}...
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
''')

print("\nAll files written successfully!")
