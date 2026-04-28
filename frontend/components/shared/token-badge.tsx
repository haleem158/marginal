"use client";
import { cn } from "@/lib/utils";

interface TokenBadgeProps {
  amount: number | string;
  symbol?: string;
  positive?: boolean;
  className?: string;
}

export function TokenBadge({ amount, symbol = "A0GI", positive, className }: TokenBadgeProps) {
  const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));
  const isPositive = positive !== undefined ? positive : numAmount >= 0;

  return (
    <span
      className={cn(
        "font-mono font-medium text-sm",
        isPositive ? "text-[#00FF88]" : "text-[#FF4455]",
        className
      )}
    >
      {isPositive ? "+" : ""}{typeof amount === 'number' ? amount.toLocaleString() : amount} {symbol}
    </span>
  );
}
