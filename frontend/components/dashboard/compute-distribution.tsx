"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { mockComputeDistribution } from "@/lib/mock-data";

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      <div style={{ color: payload[0].payload.color }}>{payload[0].name}</div>
      <div className="text-[#F5F5F5]">{payload[0].value}%</div>
    </div>
  );
};

const CustomLegend = () => (
  <div className="flex flex-col gap-2 mt-4">
    {mockComputeDistribution.map((entry) => (
      <div key={entry.name} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-[#888888]">{entry.name}</span>
        </div>
        <span className="font-mono text-xs text-[#F5F5F5]">{entry.value}%</span>
      </div>
    ))}
  </div>
);

export function ComputeDistribution() {
  return (
    <div className="p-6 rounded-xl bg-white/2 border border-white/6 h-full">
      <h3 className="text-sm font-semibold text-[#F5F5F5] mb-1">Compute Distribution</h3>
      <p className="text-xs text-[#555555] mb-4">By agent type this epoch</p>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={mockComputeDistribution}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
          >
            {mockComputeDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <CustomLegend />
    </div>
  );
}
