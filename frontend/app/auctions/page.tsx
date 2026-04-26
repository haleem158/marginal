"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AuctionCard } from "@/components/auctions/auction-card";
import { BidPanel } from "@/components/auctions/bid-panel";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { mockAuctions, Auction } from "@/lib/mock-data";
import { api } from "@/lib/api";
import type { TaskState } from "@/lib/api";

const models = ["All Models", "qwen3.6-plus", "GLM-5-FP8"];
const sorts  = ["Time Remaining", "Bid Count", "Compute Est."];

const STATE_LABELS: Record<number, Auction["status"]> = {
  0: "live",      // Open
  1: "ending",    // Revealing
  2: "pending",   // Executing
  3: "closed",    // Completed
  4: "closed",    // Settled
  5: "closed",    // Refunded
};

function taskToAuction(t: TaskState): Auction {
  const now = Math.floor(Date.now() / 1000);
  const status = STATE_LABELS[t.state] ?? "closed";
  const timeRemaining =
    t.state === 0 ? Math.max(0, t.bidDeadline - now) :
    t.state === 1 ? Math.max(0, t.revealDeadline - now) :
    t.state === 2 ? Math.max(0, t.executeDeadline - now) : 0;

  const desc = t.description.toLowerCase();
  const type =
    desc.includes("code") || desc.includes("implement") || desc.includes("write") ? "code-gen" :
    desc.includes("summar") || desc.includes("analyz") || desc.includes("analys") ? "analysis" :
    desc.includes("classif") || desc.includes("detect") ? "classification" : "inference";

  return {
    id: String(t.id),
    type,
    model: "qwen3.6-plus",
    computeEst: t.computeUnits,
    currentBid: Number(BigInt(t.highestBid)) / 1e18,
    bidCount:   t.bidCount,
    timeRemaining,
    status,
    rewardPool: Number(BigInt(t.reservePrice)) / 1e18,
    taskDescription: t.description,
  };
}

export default function AuctionsPage() {
  const [selectedModel, setSelectedModel] = useState("All Models");
  const [selectedSort,  setSelectedSort]  = useState("Time Remaining");
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>(mockAuctions);
  const [live, setLive] = useState(false);

  const fetchAuctions = useCallback(async () => {
    try {
      const data = await api.getActiveTasks();
      if (data.tasks.length > 0) {
        setAuctions(data.tasks.map(taskToAuction));
        setLive(true);
      } else {
        // No active tasks on chain — keep mock for demo
        setAuctions(mockAuctions);
        setLive(false);
      }
    } catch {
      // Auctioneer offline — keep mock data
      setLive(false);
    }
  }, []);

  useEffect(() => {
    fetchAuctions();
    const id = setInterval(fetchAuctions, 10_000);
    return () => clearInterval(id);
  }, [fetchAuctions]);

  const filtered = auctions
    .filter((a) => selectedModel === "All Models" || a.model === selectedModel)
    .sort((a, b) => {
      if (selectedSort === "Time Remaining") return a.timeRemaining - b.timeRemaining;
      if (selectedSort === "Bid Count") return b.bidCount - a.bidCount;
      return b.computeEst - a.computeEst;
    });

  const liveCount = auctions.filter(
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
            {!live && (
              <span className="text-[10px] font-mono text-[#555555]">demo data</span>
            )}
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
