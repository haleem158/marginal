"use client";
import { cn } from "@/lib/utils";

interface LiveMockBadgeProps {
  isLive: boolean;
  className?: string;
}

export function LiveMockBadge({ isLive, className }: LiveMockBadgeProps) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider",
        isLive
          ? "bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20"
          : "bg-white/4 text-[#555555] border border-white/8",
        className
      )}
    >
      {isLive ? "● live" : "● mock"}
    </span>
  );
}
