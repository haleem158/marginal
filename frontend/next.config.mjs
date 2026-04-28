/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS: process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS || "",
    NEXT_PUBLIC_STAKE_VAULT_ADDRESS:   process.env.NEXT_PUBLIC_STAKE_VAULT_ADDRESS || "",
    NEXT_PUBLIC_MARGINAL_NFT_ADDRESS:  process.env.NEXT_PUBLIC_MARGINAL_NFT_ADDRESS || "",
    NEXT_PUBLIC_CHAIN_ID:              process.env.NEXT_PUBLIC_CHAIN_ID || "16661",
    NEXT_PUBLIC_RPC_URL:               process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc.0g.ai",
    NEXT_PUBLIC_OG_EXPLORER:           process.env.NEXT_PUBLIC_OG_EXPLORER || "https://chainscan.0g.ai",
    NEXT_PUBLIC_AUCTIONEER_URL:        process.env.NEXT_PUBLIC_AUCTIONEER_URL || "http://localhost:8000",
  },
  experimental: { serverComponentsExternalPackages: ["viem"] },
  webpack(config) {
    // Stub any wagmi/connectors exports that RainbowKit references but the
    // installed wagmi version doesn't provide (e.g. baseAccount in wagmi 2.x vs 3.x).
    config.resolve.alias = {
      ...config.resolve.alias,
      // @metamask/sdk ships React Native deps that don't exist in a browser build.
      // Stub them out so Next.js webpack doesn't fail trying to resolve them.
      "@react-native-async-storage/async-storage": false,
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
