"use client";

import { motion } from "framer-motion";
import { Cpu, Users, Timer, ChevronRight } from "lucide-react";
import { Auction } from "@/lib/mock-data";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { cn } from "@/lib/utils";

function Countdown({ seconds }: { seconds: number }) {
  const urgent = seconds < 30;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <motion.span
      animate={urgent ? { color: ["#FF4455", "#F5F5F5", "#FF4455"] } : {}}
      transition={{ duration: 0.5, repeat: Infinity }}
      className={cn("font-mono text-sm font-semibold tabular-nums", !urgent && "text-[#F5F5F5]")}
    >
      {m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`}
    </motion.span>
  );
}

const typeColors: Record<string, string> = {
  Summarization: "#00C2FF",
  "Code Generation": "#A78BFA",
  Research: "#10B981",
  Classification: "#F59E0B",
};

interface AuctionCardProps {
  auction: Auction;
  onBid: () => void;
}

export function AuctionCard({ auction, onBid }: AuctionCardProps) {
  const statusMap = {
    live:    { label: "LIVE",    status: "live" as const },
    ending:  { label: "ENDING",  status: "ending" as const },
    pending: { label: "PENDING", status: "offline" as const },
    closed:  { label: "CLOSED",  status: "offline" as const },
  };
  const s = statusMap[auction.status];
  const typeColor = typeColors[auction.type] ?? "#888888";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="relative flex flex-col p-5 rounded-xl bg-white/2 border border-white/6 hover:border-white/10 transition-colors overflow-hidden"
    >
      {/* Status strip */}
      <div className="flex items-center justify-between mb-4">
        <LiveIndicator status={s.status} label={s.label} />
        <span
          className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase"
          style={{ color: typeColor, background: `${typeColor}15` }}
        >
          {auction.type}
        </span>
      </div>

      {/* Task ID */}
      <div className="mb-3">
        <span className="text-xs text-[#555555] font-mono">Task </span>
        <span className="font-mono text-lg font-bold text-[#F5F5F5]">#{auction.id}</span>
      </div>

      {/* Model badge */}
      <code className="inline-block mb-4 px-2 py-0.5 rounded bg-white/6 border border-white/8 text-xs font-mono text-[#888888]">
        {auction.model}
      </code>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <Cpu size={13} className="text-[#555555]" />
          <div>
            <div className="font-mono text-xs font-semibold text-[#F5F5F5]">{auction.computeEst.toLocaleString()}</div>
            <div className="text-[10px] text-[#555555]">tokens est.</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-[#555555]" />
          <div>
            <div className="font-mono text-xs font-semibold text-[#F5F5F5]">{auction.bidCount}</div>
            <div className="text-[10px] text-[#555555]">bidding</div>
          </div>
        </div>
      </div>

      {/* Bid + timer */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-[10px] text-[#555555] mb-0.5">Current Bid</div>
          <div className="font-mono text-lg font-bold text-[#00C2FF]">
            {auction.currentBid}{" "}
            <span className="text-xs font-normal text-[#555555]">A0GI</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#555555] mb-0.5 flex items-center gap-1 justify-end">
            <Timer size={10} /> Time left
          </div>
          <Countdown seconds={auction.timeRemaining} />
        </div>
      </div>

      {/* Reward pool */}
      <div className="text-[11px] text-[#555555] font-mono mb-4">
        Est. reward pool:{" "}
        <span className="text-[#00FF88]">{auction.rewardPool} A0GI</span>
      </div>

      {/* CTA */}
      <button
        onClick={onBid}
        disabled={auction.status === "closed"}
        className={cn(
          "w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-colors",
          auction.status !== "closed"
            ? "bg-[#00C2FF]/10 border border-[#00C2FF]/20 text-[#00C2FF] hover:bg-[#00C2FF]/15"
            : "bg-white/4 border border-white/8 text-[#555555] cursor-not-allowed"
        )}
      >
        Place Bid
        <ChevronRight size={14} />
      </button>
    </motion.div>
  );
}
