"use client";
import { cn } from "@/lib/utils";
import type { AgentType } from "@/lib/mock-data";

const agentColors: Record<AgentType, string> = {
  auctioneer: '#A78BFA',
  executor: '#00C2FF',
  auditor: '#F59E0B',
  treasury: '#10B981',
  memory: '#EC4899',
};

const agentLabels: Record<AgentType, string> = {
  auctioneer: 'Auctioneer',
  executor: 'Executor',
  auditor: 'Auditor',
  treasury: 'Treasury',
  memory: 'Memory Indexer',
};

interface AgentTypeBadgeProps {
  type: AgentType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AgentTypeBadge({ type, size = 'sm', className }: AgentTypeBadgeProps) {
  const color = agentColors[type];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-mono font-medium uppercase tracking-wider",
        size === 'sm' && "px-1.5 py-0.5 text-[10px]",
        size === 'md' && "px-2 py-1 text-xs",
        size === 'lg' && "px-3 py-1.5 text-sm",
        className
      )}
      style={{
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      {agentLabels[type]}
    </span>
  );
}

export { agentColors, agentLabels };
