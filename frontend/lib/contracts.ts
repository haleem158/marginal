/**
 * contracts.ts — Typed contract definitions for the frontend.
 * ABIs are minimal (only functions the UI needs to call/read).
 */

export const AUCTION_HOUSE_ADDRESS = process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS as `0x${string}`;
export const STAKE_VAULT_ADDRESS   = process.env.NEXT_PUBLIC_STAKE_VAULT_ADDRESS   as `0x${string}`;
export const MARGINAL_NFT_ADDRESS  = process.env.NEXT_PUBLIC_MARGINAL_NFT_ADDRESS  as `0x${string}`;
export const OG_EXPLORER           = process.env.NEXT_PUBLIC_OG_EXPLORER || "https://chainscan-galileo.0g.ai";

// ── Chain definition ─────────────────────────────────────────────────────────
export const ogTestnet = {
  id:           Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 16602),
  name:         "0G Chain Testnet",
  nativeCurrency: { name: "A0GI", symbol: "A0GI", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc-testnet.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "0G Explorer", url: OG_EXPLORER },
  },
  testnet: true,
} as const;

// ── AuctionHouse ABI (UI-relevant subset) ─────────────────────────────────────
export const AUCTION_HOUSE_ABI = [
  {
    name: "taskCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getTask",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id",                   type: "uint256" },
          { name: "submitter",            type: "address" },
          { name: "description",          type: "string"  },
          { name: "computeUnitsEstimate", type: "uint256" },
          { name: "difficultyScore",      type: "uint256" },
          { name: "reservePrice",         type: "uint256" },
          { name: "taskFee",              type: "uint256" },
          { name: "bidDeadline",          type: "uint256" },
          { name: "revealDeadline",       type: "uint256" },
          { name: "executeDeadline",      type: "uint256" },
          { name: "state",                type: "uint8"   },
          { name: "winner",               type: "address" },
          { name: "winningBid",           type: "uint256" },
          { name: "highestBid",           type: "uint256" },
          { name: "computeUnitsUsed",     type: "uint256" },
          { name: "storagePointer",       type: "string"  },
          { name: "outputHash",           type: "bytes32" },
        ],
      },
    ],
  },
  {
    name: "getActiveTasks",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256[]" }],
  },
  {
    name: "getTaskBidders",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [{ type: "address[]" }],
  },
  {
    name: "reservePricePerUnit",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "placeBid",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "taskId",     type: "uint256" },
      { name: "commitment", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "revealBid",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "salt",   type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "totalTasksCompleted",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "TaskSubmitted",
    type: "event",
    inputs: [
      { name: "taskId",        type: "uint256", indexed: true },
      { name: "submitter",     type: "address", indexed: true },
      { name: "difficultyScore", type: "uint256" },
      { name: "reservePrice",  type: "uint256" },
      { name: "bidDeadline",   type: "uint256" },
    ],
  },
  {
    name: "AuctionCleared",
    type: "event",
    inputs: [
      { name: "taskId",      type: "uint256", indexed: true },
      { name: "winner",      type: "address", indexed: true },
      { name: "secondPrice", type: "uint256" },
      { name: "bidderCount", type: "uint256" },
    ],
  },
  {
    name: "TaskSettled",
    type: "event",
    inputs: [
      { name: "taskId",          type: "uint256", indexed: true },
      { name: "efficiencyScore", type: "uint256" },
    ],
  },
] as const;

// ── StakeVault ABI (UI-relevant subset) ───────────────────────────────────────
export const STAKE_VAULT_ABI = [
  {
    name: "getAgentRecord",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "totalStake",       type: "uint256" },
          { name: "lifetimeRewards",  type: "uint256" },
          { name: "lifetimeSlashed",  type: "uint256" },
          { name: "tasksCompleted",   type: "uint256" },
          { name: "efficiencyScore",  type: "uint256" },
          { name: "registeredAt",     type: "uint256" },
          { name: "registered",       type: "bool"    },
        ],
      },
    ],
  },
  {
    name: "totalTasksSettled",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "currentEpoch",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "bootstrapSubsidy",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "registerAndStake",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
] as const;

// ── MarginalNFT ABI (UI-relevant subset) ──────────────────────────────────────
export const MARGINAL_NFT_ABI = [
  {
    name: "getAgentMetadata",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "name",                 type: "string"  },
          { name: "model",                type: "string"  },
          { name: "intelligencePointer",  type: "string"  },
          { name: "memoryLogPointer",     type: "string"  },
          { name: "memoryKVPointer",      type: "string"  },
          { name: "efficiencyScore",      type: "uint256" },
          { name: "tasksCompleted",       type: "uint256" },
          { name: "mintedAt",             type: "uint256" },
          { name: "originalMinter",       type: "address" },
        ],
      },
    ],
  },
  {
    name: "agentToToken",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "nextTokenId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ── Task state labels ─────────────────────────────────────────────────────────
export const TASK_STATES: Record<number, { label: string; color: string }> = {
  0: { label: "Open",      color: "text-blue-400"   },
  1: { label: "Revealing", color: "text-yellow-400" },
  2: { label: "Executing", color: "text-orange-400" },
  3: { label: "Completed", color: "text-purple-400" },
  4: { label: "Settled",   color: "text-green-400"  },
  5: { label: "Refunded",  color: "text-gray-400"   },
};
