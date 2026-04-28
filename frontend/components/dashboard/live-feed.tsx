"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { mockEvents } from "@/lib/mock-data";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { api, RecentEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

// Covers both the legacy mock types and the new on-chain state types.
const eventConfig: Record<string, { label: string; color: string; bg: string }> = {
  BID_OPEN:      { label: "OPEN",         color: "#00C2FF", bg: "rgba(0,194,255,0.10)" },
  REVEAL_PHASE:  { label: "REVEALING",    color: "#A78BFA", bg: "rgba(167,139,250,0.10)" },
  AUCTION_WON:   { label: "AUCTION WON", color: "#00C2FF", bg: "rgba(0,194,255,0.10)" },
  TASK_SCORED:   { label: "SCORED",       color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
  REWARD_PAID:   { label: "REWARD",       color: "#00FF88", bg: "rgba(0,255,136,0.10)" },
  REFUNDED:      { label: "REFUNDED",     color: "#6B7280", bg: "rgba(107,114,128,0.10)" },
  AGENT_SLASHED: { label: "SLASHED",      color: "#FF4455", bg: "rgba(255,68,85,0.10)" },
  MEMORY_WRITTEN:{ label: "STORED",       color: "#EC4899", bg: "rgba(236,72,153,0.10)" },
};

interface FeedItem {
  key: string;
  type: string;
  taskId: string;
  agent: string;
  amount: number;
  description?: string;
}

function EventRow({ item }: { item: FeedItem }) {
  const cfg = eventConfig[item.type] ?? { label: item.type, color: "#888", bg: "rgba(136,136,136,0.10)" };
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -12 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-start gap-3 py-3 border-b border-white/4 last:border-0"
    >
      <div className="shrink-0 mt-0.5">
        <span
          className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider"
          style={{ color: cfg.color, background: cfg.bg }}
        >
          {cfg.label}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#888888] truncate">
          Task{" "}
          <span className="font-mono text-[#F5F5F5]">#{item.taskId}</span>
          {item.agent !== "—" && (
            <>
              {" · "}
              <span className="font-mono text-[#555555]">{item.agent}</span>
            </>
          )}
        </div>
        {item.description && (
          <div className="text-[11px] text-[#555555] truncate mt-0.5">{item.description}</div>
        )}
        {item.amount !== 0 && (
          <div className={cn("text-xs font-mono font-medium mt-0.5", item.amount > 0 ? "text-[#00FF88]" : "text-[#FF4455]")}>
            {item.amount > 0 ? "+" : ""}{item.amount.toFixed(4)} A0GI
          </div>
        )}
      </div>
    </motion.div>
  );
}

function apiEventToFeedItem(e: RecentEvent): FeedItem {
  return {
    key: `chain-${e.id}-${e.type}`,
    type: e.type,
    taskId: e.taskId,
    agent: e.agent,
    amount: e.amount,
    description: e.description,
  };
}

// Seed from mock data so the panel is never blank on first render.
const MOCK_SEED: FeedItem[] = mockEvents.slice(0, 6).map((e) => ({
  key: `mock-${e.id}`,
  type: e.type,
  taskId: e.taskId,
  agent: e.agent,
  amount: e.amount,
}));

export function LiveFeed() {
  const [items, setItems] = useState<FeedItem[]>(MOCK_SEED);
  const [isLive, setIsLive] = useState(false);
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await api.getRecentEvents();
        if (cancelled || !res.events?.length) return;

        const incoming = res.events.map(apiEventToFeedItem);

        // Detect if any new task IDs appeared vs last poll → show "new" badge
        const incomingIds = new Set(incoming.map((i) => `${i.taskId}-${i.type}`));
        const hasNew = [...incomingIds].some((id) => !prevIdsRef.current.has(id));
        prevIdsRef.current = incomingIds;

        setItems(incoming);
        setIsLive(true);
        if (hasNew) {
          // Briefly flash state back to trigger AnimatePresence re-animation
          setItems([]);
          setTimeout(() => setItems(incoming), 50);
        }
      } catch {
        // API offline — keep current items, show degraded indicator
        setIsLive(false);
      }
    }

    poll();
    const interval = setInterval(poll, 8_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="p-6 rounded-xl bg-white/2 border border-white/6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#F5F5F5]">Live Events</h3>
        <LiveIndicator status={isLive ? "live" : "offline"} label={isLive ? "CHAIN" : "OFFLINE"} />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden -mr-1 pr-1">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <EventRow key={item.key} item={item} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
