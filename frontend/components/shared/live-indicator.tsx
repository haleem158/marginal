"use client";
import { cn } from "@/lib/utils";

type LiveStatus = 'live' | 'ending' | 'offline';

interface LiveIndicatorProps {
  status?: LiveStatus;
  className?: string;
  label?: string;
}

export function LiveIndicator({ status = 'live', className, label }: LiveIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75",
            status === 'live' && "bg-[#00FF88] pulse-live",
            status === 'ending' && "bg-[#FFB800] pulse-ending",
            status === 'offline' && "bg-[#555555]"
          )}
          style={
            status === 'live'
              ? { animation: 'pulse-live 2s ease-in-out infinite' }
              : status === 'ending'
              ? { animation: 'pulse-live 0.8s ease-in-out infinite' }
              : undefined
          }
        />
        <span
          className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            status === 'live' && "bg-[#00FF88]",
            status === 'ending' && "bg-[#FFB800]",
            status === 'offline' && "bg-[#555555]"
          )}
        />
      </span>
      {label && (
        <span
          className={cn(
            "text-xs font-mono uppercase tracking-wider",
            status === 'live' && "text-[#00FF88]",
            status === 'ending' && "text-[#FFB800]",
            status === 'offline' && "text-[#555555]"
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
