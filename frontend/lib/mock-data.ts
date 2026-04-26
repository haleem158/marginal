export type AgentType = 'executor' | 'auctioneer' | 'auditor' | 'treasury' | 'memory';
export type AgentStatus = 'active' | 'slashed' | 'cooldown';
export type AuctionStatus = 'live' | 'ending' | 'pending' | 'closed';
export type EventType = 'AUCTION_WON' | 'TASK_SCORED' | 'AGENT_SLASHED' | 'REWARD_PAID' | 'MEMORY_WRITTEN';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  score: number;
  tasks: number;
  stake: number;
  earned: number;
  slashed: number;
  status: AgentStatus;
  lastActive: string;
  tokenId: string;
  mintDate: string;
  description: string;
}

export interface Auction {
  id: string;
  type: string;
  model: 'qwen3.6-plus' | 'GLM-5-FP8';
  computeEst: number;
  currentBid: number;
  bidCount: number;
  timeRemaining: number;
  status: AuctionStatus;
  rewardPool: number;
  taskDescription: string;
}

export interface LiveEvent {
  id: number;
  type: EventType;
  taskId: string;
  agent: string;
  score: number;
  amount: number;
  time: string;
}

export interface HistoryEvent {
  id: number;
  type: EventType;
  taskId: string;
  agent: string;
  score: number;
  computeUsed: number;
  amount: number;
  block: string;
  time: string;
  txHash: string;
  storageKey?: string;
  bidAmount?: number;
  secondPrice?: number;
}

export const mockAgents: Agent[] = [
  { id: '0x7f3ac291', name: 'Executor Alpha', type: 'executor', score: 0.94, tasks: 847, stake: 12400, earned: 18200, slashed: 0, status: 'active', lastActive: '2m ago', tokenId: '#0001', mintDate: 'Jan 12, 2025', description: 'High-efficiency summarization & research specialist.' },
  { id: '0x2b9c8e44', name: 'Executor Beta', type: 'executor', score: 0.31, tasks: 203, stake: 1200, earned: 840, slashed: 2100, status: 'slashed', lastActive: '1h ago', tokenId: '#0002', mintDate: 'Jan 15, 2025', description: 'Code generation specialist. Currently in recovery period.' },
  { id: '0x4d8f1a77', name: 'Auditor Prime', type: 'auditor', score: 0.88, tasks: 2100, stake: 45000, earned: 62000, slashed: 0, status: 'active', lastActive: '30s ago', tokenId: '#0003', mintDate: 'Jan 10, 2025', description: 'Primary network auditor. Independent verification specialist.' },
  { id: '0x9e3d5b12', name: 'Executor Gamma', type: 'executor', score: 0.77, tasks: 412, stake: 8900, earned: 11200, slashed: 500, status: 'active', lastActive: '5m ago', tokenId: '#0004', mintDate: 'Feb 1, 2025', description: 'Classification and structured output specialist.' },
  { id: '0x1c7a9f63', name: 'Executor Delta', type: 'executor', score: 0.85, tasks: 634, stake: 15600, earned: 21000, slashed: 200, status: 'active', lastActive: '8m ago', tokenId: '#0005', mintDate: 'Jan 28, 2025', description: 'Multi-modal reasoning and analysis.' },
  { id: '0x5b2e3d90', name: 'Treasury Prime', type: 'treasury', score: 0.92, tasks: 4821, stake: 120000, earned: 0, slashed: 0, status: 'active', lastActive: '1s ago', tokenId: '#0006', mintDate: 'Jan 10, 2025', description: 'Manages reward distribution and slash enforcement.' },
  { id: '0x8f4c1e28', name: 'Memory Indexer', type: 'memory', score: 0.99, tasks: 9214, stake: 25000, earned: 0, slashed: 0, status: 'active', lastActive: '1s ago', tokenId: '#0007', mintDate: 'Jan 10, 2025', description: 'Writes all history to 0G Storage KV + Log layers.' },
  { id: '0x3a6d8c45', name: 'Auctioneer Main', type: 'auctioneer', score: 0.96, tasks: 4821, stake: 80000, earned: 0, slashed: 0, status: 'active', lastActive: '1s ago', tokenId: '#0008', mintDate: 'Jan 10, 2025', description: 'Accepts tasks, estimates compute, runs Vickrey auctions.' },
  { id: '0xb1f9e7c3', name: 'Executor Epsilon', type: 'executor', score: 0.62, tasks: 189, stake: 4200, earned: 5100, slashed: 800, status: 'cooldown', lastActive: '45m ago', tokenId: '#0009', mintDate: 'Mar 5, 2025', description: 'Speed-optimized inference, GLM-5-FP8 specialist.' },
  { id: '0xd4a2b8f6', name: 'Executor Zeta', type: 'executor', score: 0.89, tasks: 521, stake: 11200, earned: 15800, slashed: 100, status: 'active', lastActive: '12m ago', tokenId: '#0010', mintDate: 'Feb 14, 2025', description: 'Advanced code generation and debugging.' },
  { id: '0x6c3e1a94', name: 'Executor Eta', type: 'executor', score: 0.73, tasks: 298, stake: 6700, earned: 8400, slashed: 650, status: 'active', lastActive: '22m ago', tokenId: '#0011', mintDate: 'Mar 1, 2025', description: 'Research synthesis and citation extraction.' },
  { id: '0xf7b5d2e8', name: 'Executor Theta', type: 'executor', score: 0.91, tasks: 712, stake: 18000, earned: 24600, slashed: 0, status: 'active', lastActive: '3m ago', tokenId: '#0012', mintDate: 'Jan 25, 2025', description: 'High-volume classification pipeline.' },
  { id: '0x2e8c4f17', name: 'Executor Iota', type: 'executor', score: 0.45, tasks: 87, stake: 900, earned: 1200, slashed: 1800, status: 'slashed', lastActive: '3h ago', tokenId: '#0013', mintDate: 'Apr 10, 2025', description: 'New executor, still calibrating efficiency.' },
  { id: '0xa3d6b9c2', name: 'Auditor Beta', type: 'auditor', score: 0.84, tasks: 1840, stake: 38000, earned: 51000, slashed: 0, status: 'active', lastActive: '2m ago', tokenId: '#0014', mintDate: 'Jan 12, 2025', description: 'Secondary auditor. Specializes in code generation tasks.' },
  { id: '0x7f1e3a56', name: 'Executor Kappa', type: 'executor', score: 0.87, tasks: 445, stake: 9800, earned: 13200, slashed: 300, status: 'active', lastActive: '6m ago', tokenId: '#0015', mintDate: 'Feb 20, 2025', description: 'Long-context document processing.' },
];

export const mockAuctions: Auction[] = [
  { id: '4821', type: 'Summarization', model: 'qwen3.6-plus', computeEst: 4200, currentBid: 142, bidCount: 7, timeRemaining: 47, status: 'live', rewardPool: 198, taskDescription: 'Summarize a 40-page research paper on neural scaling laws and extract the 5 key findings with supporting evidence.' },
  { id: '4820', type: 'Code Generation', model: 'GLM-5-FP8', computeEst: 8800, currentBid: 280, bidCount: 4, timeRemaining: 180, status: 'live', rewardPool: 392, taskDescription: 'Generate a complete REST API in TypeScript with authentication, rate limiting, and OpenAPI documentation.' },
  { id: '4819', type: 'Classification', model: 'qwen3.6-plus', computeEst: 1100, currentBid: 38, bidCount: 12, timeRemaining: 15, status: 'ending', rewardPool: 53, taskDescription: 'Classify 200 customer support tickets into 8 predefined categories with confidence scores.' },
  { id: '4818', type: 'Research', model: 'qwen3.6-plus', computeEst: 12400, currentBid: 410, bidCount: 3, timeRemaining: 340, status: 'live', rewardPool: 574, taskDescription: 'Conduct a comprehensive literature review on quantum error correction methods, comparing the top 10 approaches.' },
  { id: '4817', type: 'Summarization', model: 'GLM-5-FP8', computeEst: 2800, currentBid: 94, bidCount: 9, timeRemaining: 92, status: 'live', rewardPool: 132, taskDescription: 'Summarize the Q4 2024 earnings calls of 5 major tech companies, focusing on AI investment mentions.' },
  { id: '4816', type: 'Code Generation', model: 'qwen3.6-plus', computeEst: 6400, currentBid: 215, bidCount: 6, timeRemaining: 220, status: 'live', rewardPool: 301, taskDescription: 'Build a production-ready React component library with Storybook documentation and unit tests.' },
  { id: '4815', type: 'Classification', model: 'GLM-5-FP8', computeEst: 900, currentBid: 30, bidCount: 15, timeRemaining: 8, status: 'ending', rewardPool: 42, taskDescription: 'Sentiment analysis on 500 social media posts about AI regulation.' },
  { id: '4814', type: 'Research', model: 'qwen3.6-plus', computeEst: 18000, currentBid: 590, bidCount: 2, timeRemaining: 480, status: 'live', rewardPool: 826, taskDescription: 'Deep analysis of DeFi protocol security vulnerabilities, focusing on flash loan attack vectors.' },
  { id: '4813', type: 'Summarization', model: 'qwen3.6-plus', computeEst: 3600, currentBid: 121, bidCount: 8, timeRemaining: 156, status: 'live', rewardPool: 169, taskDescription: 'Executive summary of 12 academic papers on transformer architecture improvements in 2024.' },
  { id: '4812', type: 'Code Generation', model: 'GLM-5-FP8', computeEst: 5200, currentBid: 174, bidCount: 5, timeRemaining: 290, status: 'pending', rewardPool: 244, taskDescription: 'Smart contract for a decentralized voting system with ZK-proofs for voter privacy.' },
  { id: '4811', type: 'Classification', model: 'qwen3.6-plus', computeEst: 1400, currentBid: 47, bidCount: 11, timeRemaining: 68, status: 'live', rewardPool: 66, taskDescription: 'Categorize 300 scientific abstracts by research domain and methodology type.' },
  { id: '4810', type: 'Research', model: 'GLM-5-FP8', computeEst: 9800, currentBid: 328, bidCount: 4, timeRemaining: 420, status: 'pending', rewardPool: 459, taskDescription: 'Market analysis report on the AI inference hardware landscape for 2025-2026.' },
];

export const mockEvents: LiveEvent[] = [
  { id: 1, type: 'AUCTION_WON', taskId: '4818', agent: '0x7f3a...c291', score: 0.94, amount: 142, time: '30s ago' },
  { id: 2, type: 'AGENT_SLASHED', taskId: '4817', agent: '0x2b9c...8e44', score: 0.31, amount: -89, time: '2m ago' },
  { id: 3, type: 'REWARD_PAID', taskId: '4816', agent: '0xf7b5...d2e8', score: 0.91, amount: 312, time: '3m ago' },
  { id: 4, type: 'TASK_SCORED', taskId: '4815', agent: '0x4d8f...1a77', score: 0.88, amount: 0, time: '4m ago' },
  { id: 5, type: 'MEMORY_WRITTEN', taskId: '4814', agent: '0x8f4c...1e28', score: 0.99, amount: 0, time: '5m ago' },
  { id: 6, type: 'AUCTION_WON', taskId: '4813', agent: '0xd4a2...b8f6', score: 0.89, amount: 196, time: '7m ago' },
  { id: 7, type: 'REWARD_PAID', taskId: '4812', agent: '0x7f1e...3a56', score: 0.87, amount: 268, time: '9m ago' },
  { id: 8, type: 'AGENT_SLASHED', taskId: '4811', agent: '0x2e8c...4f17', score: 0.45, amount: -120, time: '12m ago' },
  { id: 9, type: 'TASK_SCORED', taskId: '4810', agent: '0xa3d6...b9c2', score: 0.84, amount: 0, time: '15m ago' },
  { id: 10, type: 'AUCTION_WON', taskId: '4809', agent: '0x1c7a...9f63', score: 0.85, amount: 178, time: '18m ago' },
];

export const mockHistoryEvents: HistoryEvent[] = [
  { id: 1, type: 'AUCTION_WON', taskId: '4818', agent: '0x7f3a...c291', score: 0.94, computeUsed: 4180, amount: 142, block: '18,492,021', time: '30s ago', txHash: '0xabc123...def456', storageKey: 'task:4818:result', bidAmount: 142, secondPrice: 138 },
  { id: 2, type: 'AGENT_SLASHED', taskId: '4817', agent: '0x2b9c...8e44', score: 0.31, computeUsed: 7200, amount: -89, block: '18,492,018', time: '2m ago', txHash: '0xdef789...abc012', storageKey: 'task:4817:result', bidAmount: 89, secondPrice: 82 },
  { id: 3, type: 'REWARD_PAID', taskId: '4816', agent: '0xf7b5...d2e8', score: 0.91, computeUsed: 5980, amount: 312, block: '18,492,015', time: '3m ago', txHash: '0x123abc...456def', storageKey: 'task:4816:result', bidAmount: 215, secondPrice: 210 },
  { id: 4, type: 'TASK_SCORED', taskId: '4815', agent: '0x4d8f...1a77', score: 0.88, computeUsed: 890, amount: 0, block: '18,492,012', time: '4m ago', txHash: '0x456def...789abc' },
  { id: 5, type: 'MEMORY_WRITTEN', taskId: '4814', agent: '0x8f4c...1e28', score: 0.99, computeUsed: 0, amount: 0, block: '18,492,010', time: '5m ago', txHash: '0x789abc...012def', storageKey: 'task:4814:metadata' },
  { id: 6, type: 'AUCTION_WON', taskId: '4813', agent: '0xd4a2...b8f6', score: 0.89, computeUsed: 3590, amount: 196, block: '18,492,007', time: '7m ago', txHash: '0x012def...345abc', storageKey: 'task:4813:result', bidAmount: 121, secondPrice: 115 },
  { id: 7, type: 'REWARD_PAID', taskId: '4812', agent: '0x7f1e...3a56', score: 0.87, computeUsed: 5100, amount: 268, block: '18,492,004', time: '9m ago', txHash: '0x345abc...678def', storageKey: 'task:4812:result', bidAmount: 174, secondPrice: 168 },
  { id: 8, type: 'AGENT_SLASHED', taskId: '4811', agent: '0x2e8c...4f17', score: 0.45, computeUsed: 2800, amount: -120, block: '18,491,998', time: '12m ago', txHash: '0x678def...901abc', storageKey: 'task:4811:result', bidAmount: 47, secondPrice: 44 },
  { id: 9, type: 'TASK_SCORED', taskId: '4810', agent: '0xa3d6...b9c2', score: 0.84, computeUsed: 9750, amount: 0, block: '18,491,995', time: '15m ago', txHash: '0x901abc...234def' },
  { id: 10, type: 'AUCTION_WON', taskId: '4809', agent: '0x1c7a...9f63', score: 0.85, computeUsed: 6290, amount: 178, block: '18,491,992', time: '18m ago', txHash: '0x234def...567abc', storageKey: 'task:4809:result', bidAmount: 215, secondPrice: 178 },
];

export const mockEfficiencyHistory = Array.from({ length: 50 }, (_, i) => ({
  task: i + 1,
  score: Math.min(1, Math.max(0, 0.65 + Math.sin(i * 0.4) * 0.2 + Math.cos(i * 0.15) * 0.1 + (Math.random() - 0.5) * 0.08)),
  reward: Math.round((0.6 + Math.random() * 0.4) * 200),
}));

export const mockMarketEfficiency = (() => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return hours.map(h => ({
    time: `${String(h).padStart(2, '0')}:00`,
    topQuartile: Math.min(1, 0.85 + Math.sin(h * 0.3) * 0.08 + Math.random() * 0.04),
    bottomQuartile: Math.max(0, 0.35 + Math.cos(h * 0.4) * 0.1 + Math.random() * 0.06),
  }));
})();

export const mockComputeDistribution = [
  { name: 'Executor', value: 68, color: '#00C2FF' },
  { name: 'Auctioneer', value: 8, color: '#A78BFA' },
  { name: 'Auditor', value: 14, color: '#F59E0B' },
  { name: 'Treasury', value: 4, color: '#10B981' },
  { name: 'Memory', value: 6, color: '#EC4899' },
];
