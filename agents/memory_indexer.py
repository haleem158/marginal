"""
memory_indexer.py — Memory Indexer Agent for MARGINAL.

Responsibilities:
  1. Subscribe to on-chain events (TaskSettled, RewardDistributed, AgentSlashed).
  2. Write real-time agent state to 0G Storage KV layer (current score, stake, task queue).
  3. Append immutable task records to 0G Storage Log layer (full audit trail).
  4. Update MarginalNFT metadata pointers when 0G Storage entries are created.
  5. Maintain a local cache for the frontend API to read from.

Two-phase commit integrity:
  Only writes to Storage AFTER on-chain confirmation (Settled state).
  If a write fails, retries up to 3 times before logging the failure.

0G Storage structure:
  KV: marginal-agent-state/{agent_address} → {score, stake, tasks, last_updated}
  Log: marginal-task-log → [{task_id, executor, score, reward/slash, timestamp, ...}]
"""
import asyncio
import json
import logging
import os
import time
from typing import Optional

from web3 import Web3
from web3.types import EventData

from config import load_config
from base_agent import BaseAgent

logger = logging.getLogger("marginal.memory_indexer")

POLL_INTERVAL = 8   # seconds
MAX_RETRIES   = 3


class MemoryIndexerAgent(BaseAgent):

    def __init__(self):
        cfg = load_config("memory_indexer")
        super().__init__(cfg, "memory_indexer")

        # Track the last block we've processed to avoid reprocessing events
        self._last_block = self.w3.eth.block_number
        self._processed_tasks: set[int] = set()

        # Local in-memory cache for frontend API
        self._agent_state_cache: dict[str, dict] = {}
        self._task_log_cache: list[dict] = []

    # ── Main loop ─────────────────────────────────────────────────────────────

    async def run(self):
        logger.info("Memory Indexer starting... current block: %d", self._last_block)

        await asyncio.gather(
            self._event_loop(),
            self._serve_cache_api(),
        )

    async def _event_loop(self):
        """Poll for new events and index them."""
        while True:
            try:
                await self._process_new_events()
            except Exception as e:
                logger.error("Event loop error: %s", e)
            await asyncio.sleep(POLL_INTERVAL)

    async def _process_new_events(self):
        current_block = self.w3.eth.block_number

        if current_block <= self._last_block:
            return

        from_block = self._last_block + 1
        to_block   = current_block

        # ── AuctionHouse events ────────────────────────────────────────────
        try:
            settled_events = self.auction_house.events.TaskSettled().get_logs(
                fromBlock=from_block, toBlock=to_block
            )
            for event in settled_events:
                await self._handle_task_settled(event)
        except Exception as e:
            logger.warning("TaskSettled event fetch error: %s", e)

        try:
            completed_events = self.auction_house.events.TaskCompleted().get_logs(
                fromBlock=from_block, toBlock=to_block
            )
            for event in completed_events:
                await self._handle_task_completed(event)
        except Exception as e:
            logger.warning("TaskCompleted event fetch error: %s", e)

        try:
            cleared_events = self.auction_house.events.AuctionCleared().get_logs(
                fromBlock=from_block, toBlock=to_block
            )
            for event in cleared_events:
                await self._handle_auction_cleared(event)
        except Exception as e:
            logger.warning("AuctionCleared event fetch error: %s", e)

        # ── StakeVault events ──────────────────────────────────────────────
        try:
            reward_events = self.stake_vault.events.RewardDistributed().get_logs(
                fromBlock=from_block, toBlock=to_block
            )
            for event in reward_events:
                await self._handle_reward(event)
        except Exception as e:
            logger.warning("RewardDistributed event fetch error: %s", e)

        try:
            slash_events = self.stake_vault.events.AgentSlashed().get_logs(
                fromBlock=from_block, toBlock=to_block
            )
            for event in slash_events:
                await self._handle_slash(event)
        except Exception as e:
            logger.warning("AgentSlashed event fetch error: %s", e)

        self._last_block = to_block
        logger.debug("Processed blocks %d-%d", from_block, to_block)

    # ── Event handlers ────────────────────────────────────────────────────────

    async def _handle_task_settled(self, event: EventData):
        task_id        = event["args"]["taskId"]
        efficiency     = event["args"]["efficiencyScore"]

        if task_id in self._processed_tasks:
            return

        logger.info("Indexing settled task #%d (score=%d)", task_id, efficiency)

        # Fetch full task data from chain
        task = self.auction_house.functions.getTask(task_id).call()
        executor = task[11]  # winner

        # Build full log entry
        log_entry = {
            "task_id":          task_id,
            "executor":         executor,
            "description":      task[2][:200],  # truncate for storage
            "compute_estimated": task[3],
            "difficulty":       task[4],
            "winning_bid_wei":  str(task[12]),   # winningBid (index 12)
            "compute_used":     task[14],        # computeUnitsUsed (index 14)
            "efficiency_score": efficiency,
            "storage_pointer":  task[15],        # storagePointer (index 15)
            "timestamp":        int(time.time()),
            "block":            event["blockNumber"],
        }

        # Append to 0G Storage Log (immutable audit trail)
        log_pointer = await self._write_with_retry(
            "log", log_entry, label=f"task#{task_id}"
        )

        self._task_log_cache.append(log_entry)
        if len(self._task_log_cache) > 50:
            self._task_log_cache = self._task_log_cache[-50:]  # keep last 50

        # Update KV state for the executor agent
        await self._update_agent_kv(executor, log_pointer)

        self._processed_tasks.add(task_id)

    async def _handle_task_completed(self, event: EventData):
        task_id  = event["args"]["taskId"]
        executor = event["args"]["executor"]
        pointer  = event["args"]["storagePointer"]

        logger.info("Task #%d completed by %s", task_id, executor[:10])

        # Update KV with "executing" → "completed" state (two-phase commit Phase 2)
        current = self._agent_state_cache.get(executor, {})
        current["last_task_id"]    = task_id
        current["last_task_state"] = "completed"
        current["last_updated"]    = int(time.time())
        self._agent_state_cache[executor] = current

        await self._write_with_retry("kv", current, label=f"agent:{executor[:10]}")

    async def _handle_auction_cleared(self, event: EventData):
        task_id    = event["args"]["taskId"]
        winner     = event["args"]["winner"]
        second_price = event["args"]["secondPrice"]

        logger.info("Auction cleared #%d → winner %s at %d wei", task_id, winner[:10], second_price)

        # Update KV: winner now has a task executing (Phase 1 of two-phase commit)
        current = self._agent_state_cache.get(winner, {})
        current["last_task_id"]    = task_id
        current["last_task_state"] = "executing"
        current["last_updated"]    = int(time.time())
        self._agent_state_cache[winner] = current

        await self._write_with_retry("kv", current, label=f"agent:{winner[:10]}")

    async def _handle_reward(self, event: EventData):
        agent  = event["args"]["agent"]
        task_id = event["args"]["taskId"]
        reward  = event["args"]["reward"]
        score   = event["args"]["efficiencyScore"]

        logger.info("Reward: agent=%s task=%d reward=%d score=%d", agent[:10], task_id, reward, score)
        await self._refresh_agent_kv(agent)

    async def _handle_slash(self, event: EventData):
        agent  = event["args"]["agent"]
        task_id = event["args"]["taskId"]
        slash   = event["args"]["slashAmount"]
        score   = event["args"]["efficiencyScore"]

        logger.warning("Slash: agent=%s task=%d slash=%d score=%d", agent[:10], task_id, slash, score)
        await self._refresh_agent_kv(agent)

    # ── KV helpers ────────────────────────────────────────────────────────────

    async def _refresh_agent_kv(self, agent_address: str):
        """Pull live agent state from chain and write to KV."""
        try:
            record = self.stake_vault.functions.getAgentRecord(agent_address).call()
            token_id = self.marginal_nft.functions.agentToToken(agent_address).call()

            state = {
                "address":          agent_address,
                "total_stake_wei":  str(record[0]),
                "lifetime_rewards_wei": str(record[1]),
                "lifetime_slashed_wei": str(record[2]),
                "tasks_completed":  record[3],
                "efficiency_score": record[4],   # 0-10000
                "nft_token_id":     token_id,
                "last_updated":     int(time.time()),
            }
            self._agent_state_cache[agent_address] = state

            await self._write_with_retry("kv", state, label=f"agent:{agent_address[:10]}")

            # Update NFT metadata if minted
            if token_id > 0:
                await self._update_nft_pointers(token_id, agent_address)

        except Exception as e:
            logger.error("Agent KV refresh failed for %s: %s", agent_address[:10], e)

    async def _update_agent_kv(self, agent_address: str, log_pointer: Optional[str]):
        """Update agent KV state after task settlement."""
        await self._refresh_agent_kv(agent_address)

        if log_pointer and agent_address in self._agent_state_cache:
            self._agent_state_cache[agent_address]["latest_log_pointer"] = log_pointer

    async def _update_nft_pointers(self, token_id: int, agent_address: str):
        """Update NFT memory pointer on-chain via MarginalNFT.updatePointers()."""
        kv_key = f"{self.cfg.kv_bucket}/{agent_address}"
        log_ptr = f"{self.cfg.log_stream_id}/{agent_address}"

        try:
            self._send_tx(
                self.marginal_nft.functions.updatePointers(token_id, log_ptr, kv_key)
            )
            logger.info("NFT #%d pointers updated", token_id)
        except Exception as e:
            logger.warning("NFT pointer update failed for token #%d: %s", token_id, e)

    # ── Storage with retry ────────────────────────────────────────────────────

    async def _write_with_retry(
        self, write_type: str, data: dict, label: str
    ) -> Optional[str]:
        """Write to 0G Storage with up to MAX_RETRIES attempts."""
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                if write_type == "log":
                    result = await self.storage_log_append(data)
                    if result:
                        return result
                elif write_type == "kv":
                    key = data.get("address", label)
                    success = await self.storage_kv_write(key, data)
                    if success:
                        return key
            except Exception as e:
                logger.warning("Storage write attempt %d/%d failed (%s): %s", attempt, MAX_RETRIES, label, e)

            if attempt < MAX_RETRIES:
                await asyncio.sleep(2 ** attempt)  # exponential back-off

        logger.error("Storage write permanently failed for %s after %d attempts", label, MAX_RETRIES)
        return None

    # ── Cache API (for frontend) ──────────────────────────────────────────────

    async def _serve_cache_api(self):
        """
        Lightweight FastAPI serving the indexed state for the frontend dashboard.
        Also serves as local Storage backend (KV + Log) when 0G Storage is unreachable.
        Runs on port 8001.
        """
        from fastapi import FastAPI, HTTPException, Request
        import uvicorn
        import uuid

        api = FastAPI(title="MARGINAL Memory Indexer Cache", version="1.0.0")

        # ── Storage backend (KV + Log) ─────────────────────────────────────
        # Used by executor (write) and auditor (read) when 0G Storage is offline.
        # Pointer format: "mgidx:<uuid8>"
        _storage: dict[str, dict] = {}

        @api.post("/storage")
        async def storage_write(request: Request):
            body = await request.json()
            sid  = str(uuid.uuid4())[:8]
            _storage[sid] = body
            ptr = f"mgidx:{sid}"
            logger.info("Storage write: %s", ptr)
            return {"id": sid, "pointer": ptr}

        @api.get("/storage/{sid}")
        async def storage_read(sid: str):
            data = _storage.get(sid)
            if not data:
                raise HTTPException(status_code=404, detail="Not found")
            return data

        # ── Agent cache API ────────────────────────────────────────────────

        @api.get("/agents")
        async def get_agents():
            return list(self._agent_state_cache.values())

        @api.get("/agents/{address}")
        async def get_agent(address: str):
            state = self._agent_state_cache.get(address)
            if not state:
                # Try fetching from chain directly
                await self._refresh_agent_kv(address)
                state = self._agent_state_cache.get(address)
            return state or {}

        @api.get("/settlements")
        async def get_settlements():
            return list(reversed(self._task_log_cache))

        @api.get("/agents/{address}/history")
        async def get_agent_history(address: str):
            """Per-agent efficiency score history derived from the task log."""
            history = [
                {
                    "epoch":     i,
                    "score":     entry["efficiency_score"] / 10000,
                    "task_id":   entry["task_id"],
                    "timestamp": entry["timestamp"],
                }
                for i, entry in enumerate(self._task_log_cache)
                if entry.get("executor", "").lower() == address.lower()
            ]
            return history

        @api.get("/metrics")
        async def get_metrics():
            """Aggregate network metrics for the dashboard."""
            agents = list(self._agent_state_cache.values())
            scores = [a["efficiency_score"] for a in agents if "efficiency_score" in a]
            avg_eff = (sum(scores) / len(scores) / 10000) if scores else 0.0

            total_compute = sum(
                e.get("compute_used", 0) for e in self._task_log_cache
            )
            total_rewards = sum(
                int(a.get("lifetime_rewards_wei", 0)) for a in agents
            )
            total_slashed = sum(
                int(a.get("lifetime_slashed_wei", 0)) for a in agents
            )
            # tasks in current epoch (last 200 entries or all if fewer)
            epoch_window = self._task_log_cache[-200:]
            return {
                "avg_efficiency":      round(avg_eff, 4),
                "total_compute_used":  total_compute,
                "total_rewards_a0gi":  round(total_rewards / 1e18, 6),
                "total_slashed_a0gi":  round(total_slashed / 1e18, 6),
                "active_agents":       len(agents),
                "tasks_this_epoch":    len(epoch_window),
            }

        @api.get("/stats")
        async def get_stats():
            total = self.auction_house.functions.totalTasksCompleted().call()
            sv_settled = self.stake_vault.functions.totalTasksSettled().call()
            epoch = self.stake_vault.functions.currentEpoch().call()
            return {
                "total_tasks_completed": total,
                "total_settled":         sv_settled,
                "current_epoch":         epoch,
                "indexed_agents":        len(self._agent_state_cache),
                "log_entries":           len(self._task_log_cache),
                "last_block":            self._last_block,
            }

        config = uvicorn.Config(
            api,
            host=os.getenv("AGENT_BIND_HOST", "127.0.0.1"),
            port=8001,
            log_level="warning"
        )
        server = uvicorn.Server(config)
        await server.serve()


if __name__ == "__main__":
    agent = MemoryIndexerAgent()
    agent.start()
