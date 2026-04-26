"use client";

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
