"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";

interface Settlement {
  task_id: number;
  executor: string;
  description: string;
  efficiency_score: number;
  winning_bid_wei: string;
  compute_used: number;
  difficulty: number;
  timestamp: number;
}

function EfficiencyBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-green-900 text-green-300 border-green-700" :
    score >= 60 ? "bg-yellow-900 text-yellow-300 border-yellow-700" :
                  "bg-red-900 text-red-300 border-red-700";
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-mono ${color}`}>
      {score}
    </span>
  );
}

export function Settlements({
  refreshKey,
  indexerUrl,
}: {
  refreshKey: number;
  indexerUrl: string;
}) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  useEffect(() => {
    fetch(`${indexerUrl}/settlements`)
      .then((r) => r.json())
      .then(setSettlements)
      .catch(() => {});
  }, [refreshKey, indexerUrl]);

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
        Recent Settlements
      </h2>

      {!settlements.length ? (
        <p className="text-sm text-gray-500 text-center py-6">
          No settlements yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
          {settlements.map((s) => (
            <div
              key={s.task_id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-xs"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-400">Task #{s.task_id}</span>
                <EfficiencyBadge score={s.efficiency_score} />
              </div>
              <p className="text-gray-300 mb-2 leading-snug">
                {s.description.slice(0, 70)}
                {s.description.length > 70 ? "…" : ""}
              </p>
              <div className="flex items-center justify-between text-gray-500">
                <span>
                  {s.executor.slice(0, 6)}…{s.executor.slice(-4)}
                </span>
                <span>
                  {s.efficiency_score >= 60 ? (
                    <span className="text-green-400">
                      +{parseFloat(formatEther(BigInt(s.winning_bid_wei))).toFixed(4)} A0GI
                    </span>
                  ) : (
                    <span className="text-red-400">
                      SLASHED
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
