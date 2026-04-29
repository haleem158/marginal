/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Force Next.js to bundle these ESM-only packages through webpack instead of
  // externalizing them as CJS requires (which fails for pure-ESM packages).
  transpilePackages: [
    "wagmi",
    "@wagmi/core",
    "@wagmi/connectors",
    "@rainbow-me/rainbowkit",
    "viem",
  ],
  env: {
    NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS: process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS || "",
    NEXT_PUBLIC_STAKE_VAULT_ADDRESS:   process.env.NEXT_PUBLIC_STAKE_VAULT_ADDRESS || "",
    NEXT_PUBLIC_MARGINAL_NFT_ADDRESS:  process.env.NEXT_PUBLIC_MARGINAL_NFT_ADDRESS || "",
    NEXT_PUBLIC_CHAIN_ID:              process.env.NEXT_PUBLIC_CHAIN_ID || "16661",
    NEXT_PUBLIC_RPC_URL:               process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc.0g.ai",
    NEXT_PUBLIC_OG_EXPLORER:           process.env.NEXT_PUBLIC_OG_EXPLORER || "https://chainscan.0g.ai",
    NEXT_PUBLIC_AUCTIONEER_URL:        process.env.NEXT_PUBLIC_AUCTIONEER_URL || "http://localhost:8000",
  },
  experimental: {},
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
