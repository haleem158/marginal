"use client";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";

interface EfficiencyRingProps {
  score: number;
  size?: number;
  animated?: boolean;
  className?: string;
}

function scoreToColor(score: number): string {
  if (score >= 0.8) return "#00FF88";
  if (score >= 0.5) return "#FFB800";
  return "#FF4455";
}

export function EfficiencyRing({ score, size = 80, animated = true, className }: EfficiencyRingProps) {
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useMotionValue(0);
  const strokeDashoffset = useTransform(progress, (v) => circumference - v * circumference);

  const displayScore = useMotionValue(0);
  const displayText = useTransform(displayScore, (v) => v.toFixed(2));

  useEffect(() => {
    if (animated) {
      const p = animate(progress, score, { duration: 1.2, ease: "easeOut" });
      const s = animate(displayScore, score, { duration: 1.2, ease: "easeOut" });
      return () => { p.stop(); s.stop(); };
    } else {
      progress.set(score);
      displayScore.set(score);
    }
  }, [score, animated, progress, displayScore]);

  const color = scoreToColor(score);
  const center = size / 2;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="font-mono font-semibold"
          style={{ fontSize: size * 0.18, color }}
        >
          {displayText}
        </motion.span>
      </div>
    </div>
  );
}
