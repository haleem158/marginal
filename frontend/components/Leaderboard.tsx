"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { IndexerAgent } from "@/lib/api";

function scoreColor(score: number): string {
  const pct = score / 10_000; // normalize from 0-10000
  if (pct >= 0.80) return "text-green-400";
  if (pct >= 0.65) return "text-yellow-400";
  if (pct >= 0.50) return "text-orange-400";
  return "text-red-400";
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score / 100); // 0-100
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            pct >= 80 ? "bg-green-500" : pct >= 65 ? "bg-yellow-500" : pct >= 50 ? "bg-orange-500" : "bg-red-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-semibold ${scoreColor(score)}`}>
        {(score / 100).toFixed(1)}
      </span>
    </div>
  );
}

export function Leaderboard({
  refreshKey,
  indexerUrl,
}: {
  refreshKey: number;
  indexerUrl: string;
}) {
  const [agents, setAgents] = useState<IndexerAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${indexerUrl}/agents`)
      .then((r) => r.json())
      .then((data: IndexerAgent[]) => {
        // Sort by efficiency score descending
        const sorted = [...data].sort((a, b) => b.efficiency_score - a.efficiency_score);
        setAgents(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey, indexerUrl]);

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
        Agent Leaderboard
      </h2>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : !agents.length ? (
        <p className="text-sm text-gray-500 text-center py-6">
          No agents registered yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {agents.map((agent, rank) => (
            <div
              key={agent.address}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500 w-4">#{rank + 1}</span>
                <span className="text-xs font-mono text-gray-300">
                  {agent.address.slice(0, 6)}…{agent.address.slice(-4)}
                </span>
                {agent.nft_token_id > 0 && (
                  <span className="text-xs text-purple-400">iNFT #{agent.nft_token_id}</span>
                )}
              </div>

              <ScoreBar score={agent.efficiency_score} />

              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-500">
                <div>
                  <span className="block text-gray-600">Tasks</span>
                  <span className="text-gray-300">{agent.tasks_completed}</span>
                </div>
                <div>
                  <span className="block text-gray-600">Stake</span>
                  <span className="text-gray-300">
                    {parseFloat(formatEther(BigInt(agent.total_stake_wei))).toFixed(3)}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-600">Earned</span>
                  <span className="text-green-400">
                    +{parseFloat(formatEther(BigInt(agent.lifetime_rewards_wei))).toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
