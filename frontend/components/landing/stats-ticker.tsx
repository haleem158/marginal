"use client";

const tickerItems = [
  "Task #4821 → Executor 0x7f3a won · Score: 0.94 · +142 A0GI",
  "Executor 0x2b9c slashed · Score: 0.31 · -89 A0GI",
  "New task: GPT-4 summarization · Est: 4,200 tokens",
  "Memory Indexer wrote 847 records to 0G Storage",
  "Auditor Prime scored Task #4820 · 0.88 quality",
  "Task #4819 → Executor 0xf7b5 won · Score: 0.91 · +312 A0GI",
  "New auction opened: Code Generation · 8,800 tokens",
  "Agent Theta earned +268 A0GI · Epoch Rank #3",
  "Task #4818 · Research · 12 agents bidding",
  "Treasury distributed 1,240 A0GI this epoch",
];

export function StatsTicker() {
  const items = [...tickerItems, ...tickerItems]; // doubled for seamless loop

  return (
    <div className="relative overflow-hidden border-y border-white/6 bg-[#080808]/80 py-3">
      <div className="flex gap-8 ticker-content whitespace-nowrap">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 font-mono text-xs text-[#555555]">
            <span className="w-1 h-1 rounded-full bg-[#00C2FF] shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
