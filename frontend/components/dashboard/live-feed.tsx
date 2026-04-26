"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { mockEvents, LiveEvent } from "@/lib/mock-data";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { cn } from "@/lib/utils";

const eventConfig: Record<string, { label: string; color: string; bg: string }> = {
  AUCTION_WON:  { label: "AUCTION WON",  color: "#00C2FF", bg: "rgba(0,194,255,0.10)" },
  TASK_SCORED:  { label: "TASK SCORED",  color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
  AGENT_SLASHED:{ label: "SLASHED",      color: "#FF4455", bg: "rgba(255,68,85,0.10)" },
  REWARD_PAID:  { label: "REWARD",       color: "#00FF88", bg: "rgba(0,255,136,0.10)" },
  MEMORY_WRITTEN:{ label: "STORED",      color: "#EC4899", bg: "rgba(236,72,153,0.10)" },
};

function EventRow({ event }: { event: LiveEvent }) {
  const cfg = eventConfig[event.type];
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
          <span className="font-mono text-[#F5F5F5]">#{event.taskId}</span>
          {" · "}
          <span className="font-mono text-[#555555]">{event.agent}</span>
        </div>
        {event.amount !== 0 && (
          <div className={cn("text-xs font-mono font-medium mt-0.5", event.amount > 0 ? "text-[#00FF88]" : "text-[#FF4455]")}>
            {event.amount > 0 ? "+" : ""}{event.amount} $MARG
          </div>
        )}
        {event.score > 0 && (
          <div className="text-[11px] font-mono text-[#555555]">Score: {event.score.toFixed(2)}</div>
        )}
      </div>
      <span className="shrink-0 text-[10px] font-mono text-[#333333] mt-0.5">{event.time}</span>
    </motion.div>
  );
}

export function LiveFeed() {
  const [events, setEvents] = useState<LiveEvent[]>(mockEvents.slice(0, 6));

  // Simulate new events every few seconds
  useEffect(() => {
    const newEventTemplates: LiveEvent[] = [
      { id: 100, type: "AUCTION_WON", taskId: "4822", agent: "0x9e3d...5b12", score: 0.77, amount: 98, time: "just now" },
      { id: 101, type: "REWARD_PAID", taskId: "4821", agent: "0xf7b5...d2e8", score: 0.91, amount: 248, time: "just now" },
      { id: 102, type: "TASK_SCORED", taskId: "4820", agent: "0x4d8f...1a77", score: 0.88, amount: 0, time: "just now" },
    ];
    let idx = 0;
    const interval = setInterval(() => {
      const newEvent = { ...newEventTemplates[idx % newEventTemplates.length], id: Date.now(), time: "just now" };
      idx++;
      setEvents((prev) => [newEvent, ...prev.slice(0, 7)]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 rounded-xl bg-white/2 border border-white/6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#F5F5F5]">Live Events</h3>
        <LiveIndicator status="live" label="LIVE" />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden -mr-1 pr-1">
        <AnimatePresence initial={false}>
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
