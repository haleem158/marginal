"use client";

import dynamic from "next/dynamic";

// Load wagmi/RainbowKit only on the client — they are ESM-only and cannot be
// require()'d during Next.js SSR, causing WagmiProvider to be undefined.
const ProvidersInner = dynamic(() => import("./providers-inner"), { ssr: false });

export function Providers({ children }: { children: React.ReactNode }) {
  return <ProvidersInner>{children}</ProvidersInner>;
}
