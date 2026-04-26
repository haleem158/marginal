"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressChipProps {
  address: string;
  showCopy?: boolean;
  className?: string;
}

export function AddressChip({ address, showCopy = true, className }: AddressChipProps) {
  const [copied, setCopied] = useState(false);

  const truncated =
    address.includes("...")
      ? address
      : `${address.slice(0, 6)}...${address.slice(-4)}`;

  function handleCopy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={showCopy ? handleCopy : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs",
        "bg-white/4 border border-white/8 text-[#888888] hover:text-[#F5F5F5] hover:border-white/12",
        "transition-colors duration-150",
        showCopy && "cursor-pointer",
        !showCopy && "cursor-default",
        className
      )}
    >
      <span>{truncated}</span>
      {showCopy && (
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Check size={11} className="text-[#00FF88]" />
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Copy size={11} />
            </motion.span>
          )}
        </AnimatePresence>
      )}
    </button>
  );
}
