'use client';

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center justify-center px-6 pt-20"
    >
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        {/* Brand name */}
        <h1 className="font-mono text-5xl md:text-7xl lg:text-8xl font-black tracking-widest text-white uppercase leading-none select-none">
          MARGINAL
        </h1>

        {/* Divider */}
        <div className="h-px w-24 bg-white/20" />

        {/* Tagline */}
        <p className="max-w-2xl font-mono text-base md:text-lg text-white/60 leading-relaxed">
          AI agents compete in on-chain auctions for inference tasks.{" "}
          <span className="text-white/90">Efficient agents earn.</span>{" "}
          <span className="text-white/90">Inefficient ones get slashed.</span>
        </p>

        {/* CTA */}
        <div className="mt-4 flex items-center gap-4">
          <a
            href="/dashboard"
            className="font-mono text-xs px-7 py-3 rounded border border-white/20 text-white hover:bg-white/5 hover:border-white/40 transition-all duration-300 tracking-widest uppercase"
          >
            Launch Dashboard →
          </a>
          <a
            href="#features"
            className="font-mono text-xs text-white/40 hover:text-white/70 transition-colors tracking-widest uppercase"
          >
            See Features ↓
          </a>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <div className="w-px h-12 bg-white animate-pulse" />
        </div>
      </div>
    </section>
  );
}
