"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Gavel,
  Bot,
  Plus,
  UserCircle,
  FileClock,
  Database,
  BarChart2,
  Settings,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { LiveIndicator } from "@/components/shared/live-indicator";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Live Auctions", href: "/auctions", icon: Gavel, badge: 12 },
  { label: "Agent Registry", href: "/agents", icon: Bot },
  { label: "Submit Task", href: "/tasks", icon: Plus },
  { label: "My Agents", href: "/agents/my", icon: UserCircle },
  { label: "History", href: "/history", icon: FileClock },
];

const secondaryItems = [
  { label: "0G Storage", href: "/storage", icon: Database },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
];

const WALLET = "0x7f3a...c291";

export function AppSidebar() {
  const [expanded, setExpanded] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const pathname = usePathname();

  return (
    <motion.aside
      animate={{ width: expanded ? 240 : 64 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="relative flex flex-col h-screen bg-[#0F0F0F] border-r border-white/6 overflow-hidden shrink-0 z-40"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/6">
        <div className="relative shrink-0">
          <Logo size={32} color="white" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00FF88]"
            style={{ animation: 'pulse-live 2s ease-in-out infinite' }} />
        </div>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="font-mono font-black text-sm tracking-widest text-[#F5F5F5] uppercase"
            >
              MARGINAL
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-150",
                  isActive
                    ? "bg-[#00C2FF]/10 text-[#00C2FF]"
                    : "text-[#888888] hover:text-[#F5F5F5] hover:bg-white/4"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-[#00C2FF]"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon size={18} className="shrink-0" />
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.badge && expanded && (
                  <AnimatePresence initial={false}>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-auto flex items-center gap-1"
                    >
                      <LiveIndicator status="live" />
                      <span className="text-[11px] font-mono text-[#00FF88] font-semibold">
                        {item.badge}
                      </span>
                    </motion.span>
                  </AnimatePresence>
                )}
              </motion.div>
            </Link>
          );
        })}

        {/* Separator */}
        <div className="my-3 border-t border-white/6" />

        {secondaryItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-150",
                  isActive
                    ? "bg-[#00C2FF]/10 text-[#00C2FF]"
                    : "text-[#555555] hover:text-[#F5F5F5] hover:bg-white/4"
                )}
              >
                <item.icon size={18} className="shrink-0" />
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}

        {/* Separator */}
        <div className="my-3 border-t border-white/6" />

        <Link href="/settings">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#555555] hover:text-[#F5F5F5] hover:bg-white/4 transition-colors duration-150 cursor-pointer">
            <Settings size={18} className="shrink-0" />
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  className="text-sm font-medium whitespace-nowrap"
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </Link>
      </nav>

      {/* Account */}
      <div className="border-t border-white/6 p-2">
        <button
          onClick={() => setAccountOpen(!accountOpen)}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/4 transition-colors duration-150"
        >
          <div className="w-8 h-8 rounded-full bg-[#00C2FF]/20 border border-[#00C2FF]/30 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-mono font-bold text-[#00C2FF]">0x</span>
          </div>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0 text-left"
              >
                <div className="text-xs font-mono text-[#F5F5F5] truncate">{WALLET}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[#00FF88] font-mono">Score: 0.94</span>
                  <span className="text-[10px] text-[#555555] font-mono">·</span>
                  <span className="text-[10px] text-[#888888] font-mono">12,400 $MARG</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {expanded && (
            <ChevronDown size={14} className="text-[#555555] shrink-0" />
          )}
        </button>

        <AnimatePresence>
          {accountOpen && expanded && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="mt-1 p-1 rounded-lg bg-[#141414] border border-white/8"
            >
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[#888888] hover:text-[#FF4455] hover:bg-[#FF4455]/8 transition-colors duration-150">
                <LogOut size={14} />
                <span>Disconnect</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
