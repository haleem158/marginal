"use client";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { mockMarketEfficiency } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const tabs = ["24h", "6h", "1h"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      <div className="text-[#555555] mb-1">{label}</div>
      <div className="text-[#00C2FF]">Top: {payload[0]?.value?.toFixed(3)}</div>
      <div className="text-[#FF4455]">Bottom: {payload[1]?.value?.toFixed(3)}</div>
    </div>
  );
};

export function EfficiencyChart() {
  const [activeTab, setActiveTab] = useState("24h");

  const data =
    activeTab === "1h"
      ? mockMarketEfficiency.slice(-4)
      : activeTab === "6h"
      ? mockMarketEfficiency.slice(-6)
      : mockMarketEfficiency;

  return (
    <div className="p-6 rounded-xl bg-white/2 border border-white/6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-[#F5F5F5]">Market Efficiency Over Time</h3>
          <p className="text-xs text-[#555555] mt-0.5">Top vs Bottom Quartile Efficiency Scores</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-white/4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-mono transition-colors",
                activeTab === tab
                  ? "bg-[#00C2FF]/15 text-[#00C2FF]"
                  : "text-[#555555] hover:text-[#888888]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#00C2FF] rounded" />
          <span className="text-[11px] text-[#555555]">Top Quartile</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#FF4455] rounded" />
          <span className="text-[11px] text-[#555555]">Bottom Quartile</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="topGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00C2FF" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#00C2FF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="bottomGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF4455" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#FF4455" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: '#555555', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 1]}
            tick={{ fill: '#555555', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
          <ReferenceLine y={0.8} stroke="#00FF88" strokeDasharray="4 4" strokeOpacity={0.3} />
          <ReferenceLine y={0.5} stroke="#FF4455" strokeDasharray="4 4" strokeOpacity={0.3} />
          <Area
            type="monotone"
            dataKey="topQuartile"
            stroke="#00C2FF"
            strokeWidth={2}
            fill="url(#topGradient)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="bottomQuartile"
            stroke="#FF4455"
            strokeWidth={1.5}
            fill="url(#bottomGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
