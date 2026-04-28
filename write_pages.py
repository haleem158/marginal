import os

dashboard = '''\
"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, Gavel, TrendingUp, Coins } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EfficiencyChart } from "@/components/dashboard/efficiency-chart";
import { LiveFeed } from "@/components/dashboard/live-feed";
import { AgentLeaderboard } from "@/components/dashboard/agent-leaderboard";
import { ComputeDistribution } from "@/components/dashboard/compute-distribution";

export default function DashboardPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="p-6 space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Total Tasks Executed" value="4,821" delta="127 today" deltaPositive icon={LayoutDashboard} iconColor="#00C2FF" />
        <MetricCard label="Active Auctions" value="12" icon={Gavel} iconColor="#A78BFA" live />
        <MetricCard label="Avg Efficiency Score" value="0.847" delta="0.02 this epoch" deltaPositive icon={TrendingUp} iconColor="#00FF88" />
        <MetricCard label="Total Staked" value="284,700 $MARG" delta="12,400 this week" deltaPositive icon={Coins} iconColor="#F59E0B" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <EfficiencyChart />
        <LiveFeed />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <AgentLeaderboard />
        <ComputeDistribution />
      </div>
    </motion.div>
  );
}
'''

path = r'c:\Users\DELL\OneDrive\Documents\Marginal\frontend\app\dashboard\page.tsx'
with open(path, 'w', encoding='utf-8') as f:
    f.write(dashboard)
print('Written:', path)
