"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Gavel, TrendingUp, Coins } from "lucide-react";
import { useReadContracts } from "wagmi";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EfficiencyChart } from "@/components/dashboard/efficiency-chart";
import { LiveFeed } from "@/components/dashboard/live-feed";
import { AgentLeaderboard } from "@/components/dashboard/agent-leaderboard";
import { ComputeDistribution } from "@/components/dashboard/compute-distribution";
import { indexer, NetworkMetrics } from "@/lib/api";
import {
  AUCTION_HOUSE_ABI, AUCTION_HOUSE_ADDRESS,
  STAKE_VAULT_ABI, STAKE_VAULT_ADDRESS,
} from "@/lib/contracts";

export default function DashboardPage() {
  const { data } = useReadContracts({
    contracts: [
      { address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI, functionName: "taskCount" },
      { address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI, functionName: "totalTasksCompleted" },
      { address: STAKE_VAULT_ADDRESS,   abi: STAKE_VAULT_ABI,   functionName: "totalTasksSettled" },
      { address: STAKE_VAULT_ADDRESS,   abi: STAKE_VAULT_ABI,   functionName: "bootstrapSubsidy" },
    ],
  });

  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchMetrics() {
      try {
        const m = await indexer.getMetrics();
        if (active) setMetrics(m);
      } catch { /* agents offline — keep null */ }
    }
    fetchMetrics();
    const id = setInterval(fetchMetrics, 20_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const taskCount         = data?.[0]?.result != null ? Number(data[0].result) : null;
  const totalCompleted    = data?.[1]?.result != null ? Number(data[1].result) : null;
  const totalSettled      = data?.[2]?.result != null ? Number(data[2].result) : null;
  const bootstrapSubsidy  = data?.[3]?.result != null
    ? (Number(data[3].result as bigint) / 1e18).toFixed(2)
    : null;

  const avgEfficiency = metrics
    ? (metrics.avg_efficiency * 100).toFixed(1) + "%"
    : "—";
  const efficiencyDelta = metrics
    ? `${metrics.active_agents} active agents`
    : "start agents to see live";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="p-6 space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total Tasks Submitted"
          value={taskCount != null ? taskCount.toLocaleString() : "—"}
          delta={totalCompleted != null ? `${totalCompleted} completed` : undefined}
          deltaPositive
          icon={LayoutDashboard}
          iconColor="#00C2FF"
        />
        <MetricCard
          label="Tasks Settled"
          value={totalSettled != null ? totalSettled.toLocaleString() : "—"}
          icon={Gavel}
          iconColor="#A78BFA"
          live={totalSettled == null}
        />
        <MetricCard
          label="Avg Efficiency Score"
          value={avgEfficiency}
          delta={efficiencyDelta}
          deltaPositive={metrics != null}
          icon={TrendingUp}
          iconColor="#00FF88"
        />
        <MetricCard
          label="Bootstrap Subsidy"
          value={bootstrapSubsidy != null ? `${bootstrapSubsidy} A0GI` : "—"}
          delta="protocol reserve"
          icon={Coins}
          iconColor="#F59E0B"
        />
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

export default function DashboardPage() {
  const { data } = useReadContracts({
    contracts: [
      { address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI, functionName: "taskCount" },
      { address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI, functionName: "totalTasksCompleted" },
      { address: STAKE_VAULT_ADDRESS,   abi: STAKE_VAULT_ABI,   functionName: "totalTasksSettled" },
      { address: STAKE_VAULT_ADDRESS,   abi: STAKE_VAULT_ABI,   functionName: "bootstrapSubsidy" },
    ],
  });

  const taskCount         = data?.[0]?.result != null ? Number(data[0].result) : null;
  const totalCompleted    = data?.[1]?.result != null ? Number(data[1].result) : null;
  const totalSettled      = data?.[2]?.result != null ? Number(data[2].result) : null;
  const bootstrapSubsidy  = data?.[3]?.result != null
    ? (Number(data[3].result as bigint) / 1e18).toFixed(2)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="p-6 space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total Tasks Submitted"
          value={taskCount != null ? taskCount.toLocaleString() : "—"}
          delta={totalCompleted != null ? `${totalCompleted} completed` : undefined}
          deltaPositive
          icon={LayoutDashboard}
          iconColor="#00C2FF"
        />
        <MetricCard
          label="Tasks Settled"
          value={totalSettled != null ? totalSettled.toLocaleString() : "—"}
          icon={Gavel}
          iconColor="#A78BFA"
          live={totalSettled == null}
        />
        <MetricCard
          label="Avg Efficiency Score"
          value="0.847"
          delta="0.02 this epoch"
          deltaPositive
          icon={TrendingUp}
          iconColor="#00FF88"
        />
        <MetricCard
          label="Bootstrap Subsidy"
          value={bootstrapSubsidy != null ? `${bootstrapSubsidy} A0GI` : "—"}
          delta="protocol reserve"
          icon={Coins}
          iconColor="#F59E0B"
        />
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
