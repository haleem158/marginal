# MARGINAL

**Decentralized Compute Allocation Market — Proof of Efficient Compute (PoEC)**

> *"Peaq proved that machines can be economic agents. MARGINAL proves that AI agents can compete in a compute economy."*

---

## What It Does

MARGINAL is a multi-agent system that treats 0G Compute as a scarce economic resource and builds a functioning market mechanism on top of it. AI agents compete in on-chain sealed-bid auctions to execute inference tasks. Agents that use compute efficiently earn rewards. Agents that waste compute get slashed. Over time, only the most efficient agents survive.

Each agent is minted as an iNFT (ERC-7857-inspired) with its full performance history embedded on 0G Storage — making agent reputation verifiable, tradeable, and composable.

---

## Architecture

```
[Task Submitter]
      │  HTTP POST /tasks/submit
      ▼
[Auctioneer Agent]  — pre-flight guard → compute estimation → AuctionHouse.submitTask()
      │  on-chain
      ▼
[AuctionHouse.sol]  — sealed-bid Vickrey auction (commit → reveal → clear)
      │
      ▼
[Executor Agents × 2]  — bid for task → win auction → call 0G Compute → write to 0G Storage Log
      │  submitResult()
      ▼
[AuctionHouse.sol]  — TaskCompleted state (Phase 2 of two-phase commit)
      │
      ▼
[Auditor Agent × 3]  — read output from 0G Storage → score quality via 0G Compute → median score
      │  settleWithScore()
      ▼
[StakeVault.sol]    — reward (score ≥ 60) or slash (score < 60) with soft floor
      │
      ▼
[Memory Indexer]    — write agent state to 0G Storage KV, append to 0G Storage Log, update NFT pointers
```

---

## 0G Protocol Integration

| 0G Component        | Usage |
|---------------------|-------|
| **0G Compute**      | All inference runs here — Executor agents (task completion) and Auditor agents (quality scoring) both call sealed models independently |
| **0G Storage KV**   | Real-time agent state — current efficiency score, stake balance, task queue. Updated via two-phase commit |
| **0G Storage Log**  | Immutable task history — every settled task writes a permanent record. This is the reputation layer iNFTs point to |
| **0G Chain**        | Three EVM contracts: AuctionHouse (auction logic), StakeVault (staking/rewards/slashing), MarginalNFT (iNFT minting) |
| **0G DA**           | Task broadcast layer — task descriptions distributed to all Executor agents without centralized coordinator |

---

## Economic Mechanics

### Vickrey Auction (Second-Price Sealed Bid)
Executors bid privately via commitment hash. The highest bidder wins but pays the second-highest price. This makes honest bidding the game-theory-optimal strategy — no incentive to shade bids.

### Efficiency Score
```
efficiency = quality × difficulty_multiplier × compute_efficiency

quality              = median of 3 independent Auditor scores (0-100)
difficulty_multiplier = 0.75 + (difficulty / 200)   # 0.75× at diff=1, 1.25× at diff=100
compute_efficiency   = min(1.5, expected_units / actual_units)
```

Score ≥ 60 → reward. Score < 60 → slash.

### Reward Formula (score ≥ 60)
```
reward = bid × (1 + 0.02 × (score - 60))   # 1.0× at 60, 1.8× at 100
+ challenger_bonus (10% for first 50 tasks)
+ early_epoch_bonus (20% from bootstrap subsidy for first 200 system tasks)
```

### Slash Formula (score < 60)
```
slash_bps = (threshold - score) / threshold × 100%
max_slash_bps = 10% + epoch × 5%  (capped at 100% from epoch 5+)
slash = bid × min(slash_bps, max_slash_bps)
```
Early-epoch soft slash floor prevents system death during bootstrapping.

### Score Decay (EWA)
```
new_score = 0.85 × old_score + 0.15 × new_raw_score
```
Historical scores decay, forcing agents to maintain performance rather than coast on past results.

---

## Contracts

| Contract         | Description |
|------------------|-------------|
| `AuctionHouse`   | Task submission, bid commit/reveal, Vickrey clearing, result submission, settlement |
| `StakeVault`     | Agent registration, staking, reward distribution, slashing, bootstrap subsidy |
| `MarginalNFT`    | iNFT minting, performance sync, reputation lockup on transfer |

**Deployed addresses** — see `deployments.json` after running deploy script.

---

## Setup

### Prerequisites
- Node.js 18+, Python 3.11+
- A funded wallet on 0G Chain testnet
- 0G Compute API key

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/marginal
cd marginal

# Contracts
npm install

# Python agents
pip install -r requirements.txt

# Frontend
cd frontend && npm install && cd ..
```

### 2. Configure

```bash
cp .env.example .env
# Fill in: DEPLOYER_PRIVATE_KEY, OG_COMPUTE_API_KEY, and agent wallet keys
```

### 3. Deploy contracts

```bash
npm run compile
npm run deploy:testnet
# Copy addresses from output into .env
```

### 4. Seed demo data (optional)

```bash
npx hardhat run scripts/seed.ts --network og-testnet
```

### 5. Run agents

```bash
python agents/run_all.py
```

### 6. Run frontend

```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

---

## Agent Roles

| Agent            | Port | Description |
|------------------|------|-------------|
| Auctioneer       | 8000 | REST API for task submission; runs auction state machine |
| Memory Indexer   | 8001 | Indexes on-chain events → 0G Storage; cache API for frontend |
| Executor (×2)    | —    | Polls for open tasks, bids, executes inference on 0G Compute |
| Auditor          | —    | Scores completed tasks via 3 independent 0G Compute calls; submits median |

---

## Running Tests

```bash
npm test
```

Tests cover: task submission fees, Vickrey second-price mechanics, losing bidder refunds, reward distribution, soft slash floor, and duplicate registration guard.

---

## iNFT Metadata Structure

```json
{
  "name": "Executor Agent #001",
  "efficiency_score": 87.4,
  "tasks_completed": 23,
  "intelligence": {
    "model": "qwen3.6-plus",
    "storage_pointer": "0g://[intelligence-hash]"
  },
  "memory": {
    "log_pointer": "0g://[task-history-log-id]",
    "kv_pointer": "marginal-agent-state/0x..."
  }
}
```

---

## Risk Mitigations Built In

| Risk | Mitigation |
|------|-----------|
| Auction collusion | Reserve price floor per compute unit; minimum stake requirement |
| Score gaming (easy tasks) | Difficulty-adjusted efficiency curve |
| Reward collapse | Bootstrap subsidy + soft slash floor in early epochs |
| Winner-takes-all | EWA score decay + challenger bonus for new agents |
| Single Auditor failure | Median of 3 independent Auditor calls |
| Orphaned tasks (KV failure) | Two-phase commit: pending → completed state transitions |
| Reputation renting | 20-task lockup on iNFT transfer |
| Prompt injection | Auctioneer pre-flight guard model call |

---

## Team

Built for the 0G Hackathon — Agent Track.

**Haleem** — Architecture, Tokenomics, Smart Contracts, Agents  
Economic design informed by mechanism design theory (Vickrey auctions, slashing equilibria) and prior DeFi work at Simlab Intelligence.
