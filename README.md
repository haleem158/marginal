# MARGINAL

**Decentralized Compute Allocation Market — Proof of Efficient Compute (PoEC)**

> *"Peaq proved that machines can be economic agents. MARGINAL proves that AI agents can compete in a compute economy."*

---

## What It Does

MARGINAL is a multi-agent system that treats compute as a scarce economic resource and builds a live market mechanism on top of 0G. AI agents compete in on-chain sealed-bid Vickrey auctions to execute inference tasks. Agents that use compute efficiently earn rewards. Agents that produce poor output get slashed. Over time, only the most efficient agents survive — creating a self-improving compute market.

Each agent is minted as an iNFT (ERC-7857-inspired) with its full performance history stored on 0G — making agent reputation verifiable, tradeable, and composable.

---

## Live Deployment — 0G Mainnet

| Contract | Address | Explorer |
|----------|---------|---------|
| **AuctionHouse** | `0x17758a3324B65FEbDccDdf3659A4eDD5487d861A` | [View ↗](https://chainscan.0g.ai/address/0x17758a3324B65FEbDccDdf3659A4eDD5487d861A) |
| **StakeVault** | `0xe2119bf943999647A8C5EA025Ea13C98c020A39F` | [View ↗](https://chainscan.0g.ai/address/0xe2119bf943999647A8C5EA025Ea13C98c020A39F) |
| **MarginalNFT** | `0xa17931723B7fAED34F8532a95F8b62DD27a06102` | [View ↗](https://chainscan.0g.ai/address/0xa17931723B7fAED34F8532a95F8b62DD27a06102) |

- **Network:** 0G Chain Mainnet (Chain ID: 16661)
- **RPC:** `https://evmrpc.0g.ai`
- **Explorer:** `https://chainscan.0g.ai`
- **Deployer:** `0xeDd32FC3030051909Cc6ad5e587C4f5F390249e6`

---

## 0G Protocol Integration

| 0G Component | How It's Used |
|---|---|
| **0G Chain** | Three production EVM contracts (AuctionHouse, StakeVault, MarginalNFT) deployed on 0G mainnet. All auction logic — bid commit/reveal, settlement, slashing — executes on 0G Chain. |
| **0G Compute** | All AI inference calls go through the 0G Compute-compatible OpenAI API. Executor agents run task inference; Auditor agents run 3 independent quality scoring calls per task. The model, temperature, and token counts are all logged on-chain. |
| **0G Storage (Log)** | Executor agents write each completed inference output to the 0G Storage Log layer. The resulting pointer is committed on-chain via `submitResult()`. Auditors read from this pointer to independently verify the output before scoring. |
| **0G Storage (KV)** | Memory Indexer agent writes live agent state (efficiency score, stake balance, task count) to 0G Storage KV after every settlement event, keyed by agent address. |
| **MarginalNFT (iNFT)** | Each agent is represented as an on-chain NFT. After every settlement the NFT's storage pointers (`logPointer`, `kvPointer`) are updated on-chain, making the agent's full history verifiable and composable. |

---

## Architecture

```
[User / Frontend]
      │  HTTP POST /tasks/submit
      ▼
[Auctioneer Agent — port 8000]
      │  pre-flight guard (0G Compute) → compute estimate (0G Compute) → AuctionHouse.submitTask() on 0G Chain
      ▼
[AuctionHouse.sol — 0G Chain]
      │  sealed-bid Vickrey auction: commit → reveal → clearAuction()
      ▼
[Executor Agents × 2]
      │  scan for state=Open → placeBid() → revealBid() → run inference (0G Compute)
      │  → write output to 0G Storage Log → submitResult() on 0G Chain
      ▼
[AuctionHouse.sol — 0G Chain]
      │  state = Completed  (two-phase commit Phase 2)
      ▼
[Auditor Agent]
      │  detect TaskCompleted → read output from 0G Storage Log
      │  → 3 independent quality scores (0G Compute) → median → settleWithScore() on 0G Chain
      ▼
[StakeVault.sol — 0G Chain]
      │  score ≥ 60 → RewardDistributed event
      │  score < 60 → AgentSlashed event
      ▼
[Memory Indexer — port 8001]
      │  subscribe to TaskSettled + RewardDistributed + AgentSlashed events
      │  → write to 0G Storage Log (immutable audit trail)
      │  → write to 0G Storage KV (live agent state)
      │  → update MarginalNFT pointers on-chain
      ▼
[Next.js Frontend — port 3000]
      │  polls Auctioneer /tasks/active every 10s (live auction view)
      │  polls Auctioneer /tasks/recent every 8s (live event feed)
      │  polls Memory Indexer /settlements (history)
```

---

## Economic Mechanics

### Vickrey Auction (Second-Price Sealed Bid)
Executors bid via keccak256 commitment hash. The highest bidder wins but pays only the **second-highest price**. This is the game-theory-optimal mechanism — honest bidding is the dominant strategy, eliminating bid-shading.

### Efficiency Score Formula
```
efficiency = quality × difficulty_multiplier × compute_multiplier

quality               = median of 3 independent Auditor LLM scores (0–100)
difficulty_multiplier = 0.75 + (difficulty / 200)   # 0.75× at diff=1, 1.25× at diff=100
compute_multiplier    = 0.85 + (min(1.5, estimated/actual) - 0.5) × 0.3
```

Score ≥ 60 → **reward**. Score < 60 → **slash**.

### Reward Formula
```
reward = bid × (1 + 0.02 × (score − 60))   # 1.0× at score 60, 1.8× at score 100
       + challenger_bonus (10% for first 50 tasks)
       + early_epoch_bonus (20% bootstrap subsidy, first 200 system tasks)
```

### Score Decay (Exponential Weighted Average)
```
new_score = 0.85 × old_score + 0.15 × new_raw_score
```
Prevents coasting on past performance.

---

## Agent Roles

| Agent | Port | Private Key Env Var | Description |
|---|---|---|---|
| **Auctioneer** | 8000 | `AUCTIONEER_PRIVATE_KEY` | REST API for task submission; runs auction state machine (startRevealPhase, clearAuction) |
| **Memory Indexer** | 8001 | `AUCTIONEER_PRIVATE_KEY` | Subscribes to on-chain events → writes to 0G Storage; serves cache API for frontend |
| **Executor** | — | `EXECUTOR_PRIVATE_KEY` | Polls for Open tasks, bids, executes inference, writes result to 0G Storage |
| **Auditor** | — | `AUDITOR_PRIVATE_KEY` | Detects Completed tasks, scores output via 3 LLM calls, submits median score |

---

## Risk Mitigations Built In

| Risk | Mitigation |
|---|---|
| Auction collusion | Reserve price floor per compute unit; minimum stake requirement |
| Score gaming (easy tasks) | Difficulty-adjusted efficiency curve |
| Reward collapse | Bootstrap subsidy + soft slash floor in early epochs |
| Winner-takes-all | EWA score decay + challenger bonus for new agents |
| Single Auditor failure | Median of 3 independent Auditor scoring calls |
| Orphaned tasks | Two-phase commit: Executing → Completed state + executeDeadline slash |
| Reputation renting | 20-task lockup on iNFT transfer |
| Prompt injection | Pre-flight guard model call on every task submission |

---

## Setup & Local Reproduction

### Prerequisites
- Node.js 18+
- Python 3.11+
- Four funded wallets on 0G Chain (deployer, auctioneer, executor, auditor)
- An OpenAI-compatible API key (0G Compute, Groq, etc.)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/marginal
cd marginal
npm install
pip install -r requirements.txt
cd frontend && npm install && cd ..
```

### 2. Configure environment

Create `.env` in the project root:

```bash
# 0G Chain
OG_RPC_URL=https://evmrpc.0g.ai
NEXT_PUBLIC_CHAIN_ID=16661

# Deployed contract addresses (mainnet)
AUCTION_HOUSE_ADDRESS=0x17758a3324B65FEbDccDdf3659A4eDD5487d861A
STAKE_VAULT_ADDRESS=0xe2119bf943999647A8C5EA025Ea13C98c020A39F
MARGINAL_NFT_ADDRESS=0xa17931723B7fAED34F8532a95F8b62DD27a06102

# Agent wallets (fund each with ~0.1 A0GI for gas)
DEPLOYER_PRIVATE_KEY=0x...
AUCTIONEER_PRIVATE_KEY=0x...
EXECUTOR_PRIVATE_KEY=0x...
AUDITOR_PRIVATE_KEY=0x...

# 0G Compute / OpenAI-compatible inference
OG_COMPUTE_API_KEY=your_key_here
OG_COMPUTE_BASE_URL=https://api.groq.com/openai/v1
OG_COMPUTE_MODEL=llama-3.3-70b-versatile

# Auctioneer settle secret (prevents unauthenticated score injection)
SETTLE_API_KEY=your_random_secret_here

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

Copy and edit frontend environment:
```bash
cp frontend/.env.local.example frontend/.env.local
# Or create frontend/.env.local with NEXT_PUBLIC_* vars
```

### 3. (Re)deploy contracts (optional — already deployed on mainnet)

```bash
npm run compile
npx hardhat run scripts/deploy.ts --network og-mainnet
```

### 4. Run agents

```bash
python agents/run_all.py
```

This starts all four agents: Auctioneer (port 8000), Memory Indexer (port 8001), Executor, Auditor.

### 5. Run frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`. Connect MetaMask to 0G Chain (Chain ID 16661, RPC `https://evmrpc.0g.ai`).

### 6. Submit a task

Via UI: go to **Tasks** page, describe your task, click **Open Auction**.  
Via API:
```bash
curl -X POST http://localhost:8000/tasks/submit \
  -H "Content-Type: application/json" \
  -d '{"description": "Summarize proof of work vs proof of stake", "submitter_address": "0x..."}'
```

Watch the task progress through states on the Tasks page (live polling every 5s).

---

## Running Tests

```bash
npm test
```

Tests cover: task submission fees, Vickrey second-price mechanics, losing bidder refunds, reward distribution, soft slash floor, and duplicate registration guard.

---

## On-Chain Activity Proof

Submit any task via the Auctioneer API, then verify on [0G Explorer](https://chainscan.0g.ai):
- `AuctionHouse.submitTask` transaction from deployer wallet
- `AuctionHouse.placeBid` + `revealBid` from executor wallet
- `AuctionHouse.submitResult` with a `storagePointer` committed on-chain
- `StakeVault.processTaskSettlement` triggering reward/slash

All contract events are indexable. The Memory Indexer subscribes to these events and maintains an immutable log.

---

## Team

Built for the 0G Hackathon — Agent Track.

**Haleem** — Architecture, Tokenomics, Smart Contracts, Agents  
Economic design informed by mechanism design theory (Vickrey auctions, slashing equilibria).


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
