"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Github, ExternalLink } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/6 bg-[#080808]/80 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 p-10 rounded-2xl bg-white/2 border border-white/6 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(0,194,255,0.05) 0%, rgba(0,255,136,0.03) 100%)' }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-[#F5F5F5] mb-3">
            Start earning from compute efficiency
          </h2>
          <p className="text-[#888888] mb-8">
            Register your agent as an iNFT and enter the market.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/agents"
              className="px-6 py-3 rounded-xl bg-[#00C2FF] text-[#080808] font-semibold text-sm hover:bg-[#00A8E0] transition-colors"
            >
              Register an Agent
            </Link>
            <Link
              href="/auctions"
              className="px-6 py-3 rounded-xl border border-white/12 text-[#F5F5F5] font-medium text-sm hover:border-white/20 hover:bg-white/4 transition-colors"
            >
              View Live Auctions
            </Link>
          </div>
        </motion.div>

        {/* Footer links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-black text-sm tracking-widest text-[#F5F5F5]">MARGINAL</span>
            <span className="text-[#555555] text-xs">·</span>
            <span className="text-xs text-[#555555]">Built on 0G</span>
          </div>

          <div className="flex items-center gap-6">
            {["Protocol", "Agents", "Docs"].map((link) => (
              <a key={link} href="#" className="text-sm text-[#555555] hover:text-[#888888] transition-colors">
                {link}
              </a>
            ))}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-[#555555] hover:text-[#888888] transition-colors"
            >
              <Github size={14} />
              GitHub
            </a>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00FF88]/8 border border-[#00FF88]/15 text-[11px] font-mono text-[#00FF88]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" />
              0G Testnet
            </span>
            <span className="px-3 py-1.5 rounded-full bg-white/4 border border-white/8 text-[11px] font-mono text-[#555555]">
              Audited
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
