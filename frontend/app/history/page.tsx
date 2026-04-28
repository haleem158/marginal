"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { mockHistoryEvents, HistoryEvent } from "@/lib/mock-data";
import { indexer, SettlementRecord } from "@/lib/api";
import { ScoreBadge } from "@/components/shared/score-badge";
import { OG_EXPLORER } from "@/lib/contracts";
import { cn } from "@/lib/utils";

const tabs = ["All Events", "Auction Results", "Reward Events", "Slash Events"];

const eventStyles: Record<string, { label: string; color: string; bg: string; accent: string }> = {
  AUCTION_WON:    { label: "AUCTION WON", color: "#00C2FF", bg: "rgba(0,194,255,0.08)",  accent: "" },
  REWARD_PAID:    { label: "REWARD",      color: "#00FF88", bg: "rgba(0,255,136,0.08)",  accent: "border-l-2 border-l-[#00FF88]" },
  AGENT_SLASHED:  { label: "SLASHED",     color: "#FF4455", bg: "rgba(255,68,85,0.08)",  accent: "border-l-2 border-l-[#FF4455]" },
  TASK_SCORED:    { label: "SCORED",      color: "#F59E0B", bg: "rgba(245,158,11,0.08)", accent: "border-l-2 border-l-[#F59E0B]" },
  MEMORY_WRITTEN: { label: "STORED",      color: "#EC4899", bg: "rgba(236,72,153,0.08)", accent: "border-l-2 border-l-[#EC4899]" },
};

// Normalise real SettlementRecord to the HistoryEvent shape used by the UI
function settlementToHistory(s: SettlementRecord, idx: number): HistoryEvent {
  const winningBidA0gi = Number(BigInt(s.winning_bid_wei)) / 1e18;
  const isReward = s.efficiency_score >= 60;
  return {
    id:          idx,
    type:        isReward ? "REWARD_PAID" : "AGENT_SLASHED",
    taskId:      String(s.task_id),
    agent:       s.executor
      ? `${s.executor.slice(0, 6)}...${s.executor.slice(-4)}`
      : "—",
    score:       s.efficiency_score / 100,
    computeUsed: s.compute_used,
    amount:      isReward
      ? parseFloat(winningBidA0gi.toFixed(4))
      : -parseFloat(winningBidA0gi.toFixed(4)),
    block:       String(s.block),
    time:        new Date(s.timestamp * 1000).toLocaleTimeString(),
    txHash:      "0x",          // txHash not in indexer record — shown as "—"
    storageKey:  s.storage_pointer || undefined,
    bidAmount:   parseFloat(winningBidA0gi.toFixed(4)),
  };
}

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState("All Events");
  const [expanded,  setExpanded]  = useState<number | null>(null);
  const [events,    setEvents]    = useState<HistoryEvent[]>(mockHistoryEvents);
  const [isLive,    setIsLive]    = useState(false);

  // Poll Memory Indexer /settlements every 10 s
  useEffect(() => {
    async function poll() {
      try {
        const records = await indexer.getSettlements();
        if (records.length > 0) {
          setEvents(records.map(settlementToHistory));
          setIsLive(true);
        }
      } catch {
        setIsLive(false);
      }
    }
    poll();
    const id = setInterval(poll, 10_000);
    return () => clearInterval(id);
  }, []);

  const tabFilters: Record<string, (e: HistoryEvent) => boolean> = {
    "All Events":      () => true,
    "Auction Results": (e) => e.type === "AUCTION_WON",
    "Reward Events":   (e) => e.type === "REWARD_PAID",
    "Slash Events":    (e) => e.type === "AGENT_SLASHED",
  };

  const filtered = events.filter(tabFilters[activeTab] ?? (() => true));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#F5F5F5]">Settlement History</h2>
          <p className="text-[#555555] text-sm mt-1">
            {isLive
              ? "Live data from Memory Indexer (0G Storage Log)"
              : "Showing mock data — start agents to see real settlements"}
          </p>
        </div>
        <span className={cn(
          "px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider",
          isLive
            ? "bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20"
            : "bg-white/4 text-[#555555] border border-white/8"
        )}>
          {isLive ? "● LIVE" : "● MOCK"}
        </span>
      </div>

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
                              {event.bidAmount} A0GI
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#555555] mb-1">Second Price</div>
                            <div className="font-mono text-sm text-[#F5F5F5]">
                              {event.secondPrice} A0GI
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
                          href={`${OG_EXPLORER}/tx/${event.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-[#00C2FF] hover:underline"
                        >
                          {event.txHash === "0x" ? "on 0G Chain ↗" : `${event.txHash.slice(0, 14)}...`}
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
