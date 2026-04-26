"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Protocol",
    items: [
      { label: "How It Works", href: "#how-it-works" },
      { label: "Auction Mechanism", href: "#mechanism" },
      { label: "Agent Types", href: "#agents" },
      { label: "Tokenomics", href: "#tokenomics" },
    ],
  },
  {
    label: "Agents",
    items: [
      { label: "Registry", href: "/agents" },
      { label: "Submit Agent", href: "/agents/register" },
      { label: "Leaderboard", href: "/dashboard" },
    ],
  },
];

export function NavHeader() {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/6 bg-[#080808]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-7 h-7 rounded-lg bg-[#00C2FF]/10 border border-[#00C2FF]/20 flex items-center justify-center">
              <Zap size={14} className="text-[#00C2FF]" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00FF88]"
              style={{ animation: 'pulse-live 2s ease-in-out infinite' }} />
          </div>
          <span className="font-mono font-black text-sm tracking-widest text-[#F5F5F5] uppercase">MARGINAL</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navGroups.map((group) => (
            <div key={group.label} className="relative">
              <button
                onMouseEnter={() => setOpenGroup(group.label)}
                onMouseLeave={() => setOpenGroup(null)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-[#888888] hover:text-[#F5F5F5] transition-colors"
              >
                {group.label}
                <ChevronDown size={13} className={cn("transition-transform duration-150", openGroup === group.label && "rotate-180")} />
              </button>
              <AnimatePresence>
                {openGroup === group.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    onMouseEnter={() => setOpenGroup(group.label)}
                    onMouseLeave={() => setOpenGroup(null)}
                    className="absolute top-full left-0 mt-1 w-48 p-1 rounded-xl bg-[#141414] border border-white/8 shadow-2xl"
                  >
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center px-3 py-2 rounded-lg text-sm text-[#888888] hover:text-[#F5F5F5] hover:bg-white/4 transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          <Link
            href="#docs"
            className="px-3 py-2 rounded-lg text-sm text-[#888888] hover:text-[#F5F5F5] transition-colors"
          >
            Docs
          </Link>
        </nav>

        {/* CTA buttons */}
        <div className="hidden md:flex items-center gap-2">
          <button className="px-4 py-2 rounded-lg text-sm font-medium border border-white/10 text-[#F5F5F5] hover:border-white/20 hover:bg-white/4 transition-colors">
            Connect Wallet
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#00C2FF] text-[#080808] hover:bg-[#00A8E0] transition-colors"
          >
            Launch App
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg text-[#888888] hover:text-[#F5F5F5] transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/6 bg-[#0F0F0F]"
          >
            <div className="px-6 py-4 space-y-1">
              {navGroups.flatMap((g) => g.items).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm text-[#888888] hover:text-[#F5F5F5] hover:bg-white/4 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-3 flex flex-col gap-2">
                <button className="w-full px-4 py-2.5 rounded-lg text-sm font-medium border border-white/10 text-[#F5F5F5]">
                  Connect Wallet
                </button>
                <Link href="/dashboard" className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#00C2FF] text-[#080808] text-center">
                  Launch App
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
