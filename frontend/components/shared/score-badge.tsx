"use client";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  className?: string;
  showSlashed?: boolean;
}

export function ScoreBadge({ score, className, showSlashed = true }: ScoreBadgeProps) {
  const isHigh = score >= 0.8;
  const isMid = score >= 0.5 && score < 0.8;
  const isSlashed = score < 0.3 && showSlashed;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold",
        isHigh && "bg-[#00FF88]/15 text-[#00FF88]",
        isMid && "bg-[#FFB800]/15 text-[#FFB800]",
        !isHigh && !isMid && isSlashed && "bg-[#FF4455]/15 text-[#FF4455]",
        !isHigh && !isMid && !isSlashed && "bg-[#FF4455]/15 text-[#FF4455]",
        className
      )}
    >
      {isSlashed ? `SLASHED · ${score.toFixed(2)}` : score.toFixed(2)}
    </span>
  );
}
