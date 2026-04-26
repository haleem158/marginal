"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import {
  AUCTION_HOUSE_ADDRESS,
  AUCTION_HOUSE_ABI,
  TASK_STATES,
} from "@/lib/contracts";

interface TaskData {
  id: bigint;
  submitter: string;
  description: string;
  computeUnitsEstimate: bigint;
  difficultyScore: bigint;
  reservePrice: bigint;
  taskFee: bigint;
  bidDeadline: bigint;
  revealDeadline: bigint;
  executeDeadline: bigint;
  state: number;
  winner: string;
  winningBid: bigint;
  highestBid: bigint;
  computeUnitsUsed: bigint;
  storagePointer: string;
  outputHash: string;
}

function useActiveTaskIds() {
  return useReadContract({
    address:     AUCTION_HOUSE_ADDRESS,
    abi:         AUCTION_HOUSE_ABI,
    functionName: "getActiveTasks",
  });
}

function TaskCard({ taskId }: { taskId: bigint }) {
  const { data: task } = useReadContract({
    address:     AUCTION_HOUSE_ADDRESS,
    abi:         AUCTION_HOUSE_ABI,
    functionName: "getTask",
    args:        [taskId],
  });

  const [expanded, setExpanded] = useState(false);

  if (!task) return <div className="h-20 bg-gray-800/50 rounded-lg animate-pulse" />;

  const t = task as unknown as TaskData;
  const stateInfo = TASK_STATES[t.state] ?? { label: "Unknown", color: "text-gray-400" };
  const now = Math.floor(Date.now() / 1000);
  const deadline =
    t.state === 0 ? Number(t.bidDeadline) :
    t.state === 1 ? Number(t.revealDeadline) :
    t.state === 2 ? Number(t.executeDeadline) : 0;

  const timeLeft = deadline > now ? deadline - now : 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-gray-500">#{Number(t.id)}</span>
            <span className={`text-xs font-medium ${stateInfo.color}`}>{stateInfo.label}</span>
            <span className="text-xs text-gray-600">
              difficulty {Number(t.difficultyScore)}/100
            </span>
          </div>
          <p
            className="text-sm text-gray-200 leading-snug cursor-pointer"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? t.description : t.description.slice(0, 100) + (t.description.length > 100 ? "…" : "")}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-500">Reserve</p>
          <p className="text-sm font-semibold text-white">
            {parseFloat(formatEther(t.reservePrice)).toFixed(4)} A0GI
          </p>
        </div>
      </div>

      {timeLeft > 0 && (
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
          <span>⏱ {minutes}m {seconds.toString().padStart(2, "0")}s</span>
          <span className="text-gray-600">
            {t.state === 0 ? "bid window" : t.state === 1 ? "reveal window" : "execution window"}
          </span>
        </div>
      )}

      {t.state === 2 && t.winner !== "0x0000000000000000000000000000000000000000" && (
        <div className="mt-2 text-xs text-orange-400">
          Winner: {t.winner.slice(0, 6)}…{t.winner.slice(-4)} |{" "}
          Paid {parseFloat(formatEther(t.winningBid)).toFixed(4)} A0GI
        </div>
      )}

      {t.state >= 4 && t.storagePointer && (
        <div className="mt-2 text-xs text-green-400 font-mono truncate">
          0G: {t.storagePointer}
        </div>
      )}
    </div>
  );
}

export function AuctionPanel({ refreshKey }: { refreshKey: number }) {
  const { data: activeIds, isLoading } = useActiveTaskIds();

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
          Active Auctions
        </h2>
        <span className="text-xs text-gray-500">
          {activeIds?.length ?? 0} tasks
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : !activeIds?.length ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No active auctions. Submit a task to start the market.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {[...activeIds].reverse().map((id) => (
            <TaskCard key={String(id)} taskId={id} />
          ))}
        </div>
      )}
    </section>
  );
}
