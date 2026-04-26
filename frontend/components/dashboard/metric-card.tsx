"use client";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveIndicator } from "@/components/shared/live-indicator";

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  icon: LucideIcon;
  iconColor?: string;
  live?: boolean;
  className?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  deltaPositive = true,
  icon: Icon,
  iconColor = "#00C2FF",
  live,
  className,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative p-6 rounded-xl bg-white/2 border border-white/6 hover:border-white/10 transition-all duration-200 overflow-hidden",
        className
      )}
    >
      {/* Subtle bg glow */}
      <div
        className="absolute top-0 right-0 w-24 h-24 opacity-10 rounded-full blur-2xl pointer-events-none"
        style={{ background: iconColor }}
      />

      <div className="relative flex items-start justify-between mb-4">
        <span className="text-xs text-[#555555] uppercase tracking-wider font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {live && <LiveIndicator status="live" />}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${iconColor}15` }}
          >
            <Icon size={16} style={{ color: iconColor }} />
          </div>
        </div>
      </div>

      <div className="font-mono text-2xl font-bold text-[#F5F5F5] tracking-tight mb-2">
        {value}
      </div>

      {delta && (
        <div className={cn("text-xs font-mono flex items-center gap-1", deltaPositive ? "text-[#00FF88]" : "text-[#FF4455]")}>
          <span>{deltaPositive ? "↑" : "↓"}</span>
          <span>{delta}</span>
        </div>
      )}
    </motion.div>
  );
}
