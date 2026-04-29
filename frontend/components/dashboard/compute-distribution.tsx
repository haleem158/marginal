"use client";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { mockComputeDistribution } from "@/lib/mock-data";
import { indexer, SettlementRecord } from "@/lib/api";
import { LiveMockBadge } from "@/components/shared/live-mock-badge";

const COLORS = ["#00C2FF", "#A78BFA", "#00FF88", "#FFB800"];

interface Slice { name: string; value: number; color: string; }

function computeSlices(records: SettlementRecord[]): Slice[] {
  if (!records.length) return [];
  const buckets = { Easy: 0, Medium: 0, Hard: 0, Expert: 0 };
  let total = 0;
  for (const r of records) {
    const d = r.difficulty;
    if (d <= 25)      buckets.Easy   += r.compute_used || r.compute_estimated;
    else if (d <= 50) buckets.Medium += r.compute_used || r.compute_estimated;
    else if (d <= 75) buckets.Hard   += r.compute_used || r.compute_estimated;
    else              buckets.Expert += r.compute_used || r.compute_estimated;
    total += r.compute_used || r.compute_estimated;
  }
  if (!total) return [];
  return (Object.entries(buckets) as [string, number][])
    .filter(([, v]) => v > 0)
    .map(([name, v], i) => ({
      name,
      value: Math.round((v / total) * 100),
      color: COLORS[i % COLORS.length],
    }));
}

interface PieTooltipItem {
  name: string;
  value: number;
  payload: Slice;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: PieTooltipItem[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      <div style={{ color: payload[0].payload.color }}>{payload[0].name}</div>
      <div className="text-[#F5F5F5]">{payload[0].value}%</div>
    </div>
  );
};

export function ComputeDistribution() {
  const [slices, setSlices] = useState<Slice[]>(mockComputeDistribution as Slice[]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetch() {
      try {
        const data = await indexer.getSettlements();
        if (!active || !data?.length) return;
        const computed = computeSlices(data);
        if (computed.length) { setSlices(computed); setIsLive(true); }
      } catch { /* stay on mock */ }
    }
    fetch();
    const id = setInterval(fetch, 20_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return (
    <div className="p-6 rounded-xl bg-white/2 border border-white/6 h-full">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-[#F5F5F5]">Compute Distribution</h3>
        <LiveMockBadge isLive={isLive} className="px-1.5 text-[9px]" />
      </div>
      <p className="text-xs text-[#555555] mb-4">By task difficulty this epoch</p>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={slices}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
          >
            {slices.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex flex-col gap-2 mt-4">
        {slices.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-[#888888]">{entry.name}</span>
            </div>
            <span className="font-mono text-xs text-[#F5F5F5]">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
