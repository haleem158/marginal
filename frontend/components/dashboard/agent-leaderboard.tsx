"use client";
import { useState, useEffect } from "react";
import { mockAgents } from "@/lib/mock-data";
import { indexer, IndexerAgent } from "@/lib/api";
import { ScoreBadge } from "@/components/shared/score-badge";
import { AddressChip } from "@/components/shared/address-chip";
import { ScoreBar } from "@/components/shared/score-bar";
import { LiveMockBadge } from "@/components/shared/live-mock-badge";
import { cn } from "@/lib/utils";

const rankStyles = ["text-[#FFB800]", "text-[#888888]", "text-[#A0522D]"];

interface LeaderEntry {
  id: string;
  name: string;
  score: number;
  tasks: number;
}

function fromIndexerAgent(a: IndexerAgent): LeaderEntry {
  return {
    id:    a.address,
    name:  `Agent-${a.address.slice(2, 8).toUpperCase()}`,
    score: a.efficiency_score / 10000,
    tasks: a.tasks_completed,
  };
}

const mockLeader: LeaderEntry[] = mockAgents
  .filter((a) => a.type === "executor")
  .sort((a, b) => b.score - a.score)
  .slice(0, 8)
  .map((a) => ({ id: a.id, name: a.name, score: a.score, tasks: a.tasks }));

export function AgentLeaderboard() {
  const [agents, setAgents] = useState<LeaderEntry[]>(mockLeader);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetch() {
      try {
        const raw = await indexer.getAgents();
        if (!active || !raw?.length) return;
        const sorted = raw
          .map(fromIndexerAgent)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);
        setAgents(sorted);
        setIsLive(true);
      } catch { /* stay on mock */ }
    }
    fetch();
    const id = setInterval(fetch, 15_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return (
    <div className="p-6 rounded-xl bg-white/2 border border-white/6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-[#F5F5F5]">Top Executor Agents — This Epoch</h3>
        <LiveMockBadge isLive={isLive} className="text-[9px]" />
      </div>

      <div className="space-y-0">
        {agents.map((agent, i) => (
          <div
            key={agent.id}
            className="flex items-center gap-3 py-2.5 border-b border-white/4 last:border-0 hover:bg-white/2 -mx-2 px-2 rounded transition-colors"
          >
            <span className={cn("w-5 text-center font-mono text-xs font-bold shrink-0", rankStyles[i] ?? "text-[#333333]")}>
              {i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}`}
            </span>
            <div className="w-7 h-7 rounded-full bg-[#00C2FF]/15 border border-[#00C2FF]/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-mono font-bold text-[#00C2FF]">
                {agent.id.slice(2, 4).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[#F5F5F5] truncate">{agent.name}</div>
              <AddressChip address={agent.id} showCopy={false} className="mt-0.5 text-[10px] py-0" />
            </div>
            <div className="hidden sm:block">
              <ScoreBar score={agent.score} />
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-xs text-[#F5F5F5]">{agent.tasks.toLocaleString()}</div>
              <div className="text-[10px] text-[#555555]">tasks</div>
            </div>
          </div>
        ))}
        {agents.length === 0 && (
          <p className="text-center text-[#555555] text-xs py-8">No agents indexed yet — start agents to populate</p>
        )}
      </div>
    </div>
  );
}

