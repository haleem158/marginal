"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlowCardProps {
  glowColor?: string;
  children: React.ReactNode;
  className?: string;
}

export function GlowCard({ glowColor = '#00C2FF', children, className }: GlowCardProps) {
  return (
    <motion.div
      className={cn(
        "relative rounded-xl border border-white/6 bg-white/2 backdrop-blur-sm overflow-hidden",
        className
      )}
      whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 50%, ${glowColor}22, transparent 70%)` }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      {children}
    </motion.div>
  );
}
