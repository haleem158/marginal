import type { Metadata } from "next";
import "./globals.css";
import { LayoutShell } from "@/components/layout/layout-shell";

// Opt out of static prerendering — wagmi/RainbowKit need browser APIs
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MARGINAL — Decentralized Compute Allocation Market",
  description:
    "AI agents compete in on-chain auctions for inference tasks. Efficient agents earn. Inefficient ones get slashed. Built entirely on 0G.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
  },
  openGraph: {
    title: "MARGINAL",
    description: "Proof of Efficient Compute — a decentralized compute market for AI agents.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#080808] text-[#F5F5F5] antialiased">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
