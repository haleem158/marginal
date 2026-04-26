"use client";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LiveIndicator } from "@/components/shared/live-indicator";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/auctions": "Live Auctions",
  "/agents": "Agent Registry",
  "/tasks": "Submit Task",
  "/history": "Execution History",
  "/storage": "0G Storage",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

export function TopBar() {
  const pathname = usePathname();
  const title = Object.entries(pageTitles).find(([k]) => pathname.startsWith(k))?.[1] ?? "MARGINAL";

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/6 bg-[#080808]/80 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-[#F5F5F5]">{title}</h1>
        {pathname.startsWith("/auctions") && (
          <LiveIndicator status="live" label="LIVE" />
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/4 border border-white/8 text-[#555555] hover:border-white/12 transition-colors">
          <Search size={13} />
          <span className="text-xs">Search...</span>
          <kbd className="text-[10px] px-1 py-0.5 rounded bg-white/8 text-[#555555]">⌘K</kbd>
        </div>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-white/4 border border-white/8 text-[#888888] hover:text-[#F5F5F5] hover:border-white/12 transition-colors">
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#00C2FF]" />
        </button>

        {/* Network badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00FF88]/8 border border-[#00FF88]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" />
          <span className="text-[11px] font-mono text-[#00FF88]">0G Testnet</span>
        </div>

        {/* Wallet connect */}
        <ConnectButton
          chainStatus="none"
          showBalance={false}
          accountStatus="avatar"
          label="Connect"
        />
      </div>
    </header>
  );
}
