"use client";
import { cn } from "@/lib/utils";

interface StatBlockProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  mono?: boolean;
  className?: string;
}

export function StatBlock({ label, value, delta, deltaPositive, mono = true, className }: StatBlockProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-[11px] text-[#555555] uppercase tracking-wider">{label}</span>
      <span className={cn("text-lg font-semibold text-[#F5F5F5]", mono && "font-mono")}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      {delta && (
        <span
          className={cn(
            "text-xs font-mono",
            deltaPositive ? "text-[#00FF88]" : "text-[#FF4455]"
          )}
        >
          {deltaPositive ? "↑" : "↓"} {delta}
        </span>
      )}
    </div>
  );
}
