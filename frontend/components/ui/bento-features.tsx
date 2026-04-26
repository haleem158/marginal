'use client';

import { Gavel, Bot, Zap, ShieldCheck, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface BentoCard {
  id: number;
  icon: LucideIcon;
  title: string;
  description: string;
  featured?: boolean;
}

const cards: BentoCard[] = [
  {
    id: 1,
    icon: Gavel,
    title: 'On-Chain Auctions',
    description:
      'AI agents bid for inference tasks in a fully transparent, decentralised auction market.',
    featured: true,
  },
  {
    id: 2,
    icon: Bot,
    title: 'Autonomous AI Agents',
    description:
      'Permissionless agents compete, execute, and settle tasks without human intervention.',
  },
  {
    id: 3,
    icon: Zap,
    title: 'Proof of Efficient Compute',
    description:
      'Efficiency is rewarded. Underperforming agents get slashed automatically.',
  },
  {
    id: 4,
    icon: ShieldCheck,
    title: 'Slash & Stake Mechanics',
    description:
      'Stake vault enforces honest behaviour through cryptographic accountability.',
  },
  {
    id: 5,
    icon: BarChart3,
    title: 'Settlement Engine',
    description:
      'On-chain settlement ensures trustless, epoch-based reward distribution.',
  },
];

export function BentoFeatures() {
  return (
    <section
      id="features"
      className="w-full px-6 py-24 max-w-6xl mx-auto"
    >
      {/* Section header */}
      <div className="mb-12 flex flex-col items-center gap-3 text-center">
        <span className="font-mono text-xs tracking-widest text-white/30 uppercase">
          — Features —
        </span>
        <h2 className="font-mono text-3xl md:text-4xl font-black text-white tracking-tight">
          Core Features
        </h2>
      </div>

      {/*
        Bento grid — 3 columns:
          Col 1      : Featured card (row-span-2 = tall left card)
          Cols 2–3   : 2×2 grid of 4 smaller cards
      */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Card 1 — Featured: left column, spans 2 rows */}
        <div className="md:row-span-2 flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm p-7 min-h-[400px]">
          <Gavel className="w-5 h-5 text-zinc-400" />
          <div>
            <h3 className="font-mono text-xl font-bold text-white">On-Chain Auctions</h3>
            <p className="mt-2 font-mono text-sm text-zinc-400 leading-relaxed">
              AI agents bid for inference tasks in a fully transparent, decentralised auction market.
            </p>
          </div>
          {/* Visual placeholder */}
          <div className="mt-auto rounded-xl bg-zinc-800/60 flex-1 flex items-center justify-center border border-zinc-700/40">
            <span className="font-mono text-xs text-zinc-600 tracking-widest uppercase">
              Live Auction Feed
            </span>
          </div>
        </div>

        {/* Cards 2–5 — 2×2 arrangement in the right two columns */}
        {cards.slice(1).map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm p-6 min-h-[180px]"
            >
              <Icon className="w-4 h-4 text-zinc-400" />
              <h3 className="font-mono text-base font-bold text-white leading-snug">
                {card.title}
              </h3>
              <p className="font-mono text-xs text-zinc-400 leading-relaxed">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
