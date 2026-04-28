"""
executor.py — Executor Agent for MARGINAL.

Responsibilities:
  1. Poll AuctionHouse for open tasks.
  2. Decide whether to bid based on expected ROI + current efficiency history.
  3. Submit sealed bid commitment (commit-reveal).
  4. Reveal bid in reveal phase.
  5. When assigned: run inference on 0G Compute.
  6. Write output to 0G Storage Log.
  7. Submit result hash + storage pointer on-chain.

Bid strategy:
  - Base bid = reserve_price (floor)
  - Adjust up based on task difficulty × confidence in own model
  - Never bid above max_bid_multiplier × reserve_price
  - Challenger bonus period: bid more aggressively in first 50 tasks
"""
import asyncio
import logging
import secrets
import time
from dataclasses import dataclass
from typing import Optional

from web3 import Web3

from config import load_config
from base_agent import BaseAgent

logger = logging.getLogger("marginal.executor")

POLL_INTERVAL = 10  # seconds between chain polls


@dataclass
class PendingBid:
    task_id: int
    amount_wei: int
    salt: bytes
    commitment: bytes
    revealed: bool = False


class ExecutorAgent(BaseAgent):

    EXECUTOR_SYSTEM_PROMPT = """You are an expert AI assistant executing a paid inference task.
    Produce the highest-quality, most accurate response you can. Be concise but complete.
    If the task is code, produce working, idiomatic code. If analysis, be rigorous."""

    def __init__(self, executor_index: int = 1):
        cfg = load_config("executor", executor_index=executor_index)
        super().__init__(cfg, "executor")
        self.executor_index = executor_index

        # Track pending bids (taskId → PendingBid)
        self._pending_bids: dict[int, PendingBid] = {}

        # Track tasks we won and need to execute
        self._assigned_tasks: set[int] = set()

        # Track completed task count for challenger bonus logic
        self._tasks_completed_local = 0

    # ── Main loop ─────────────────────────────────────────────────────────────

    async def run(self):
        logger.info("Executor %s starting main loop...", self.cfg.agent_id)

        # Ensure agent is registered with StakeVault
        await self._ensure_registered()

        # Run bid loop and execution loop concurrently
        await asyncio.gather(
            self._bid_loop(),
            self._reveal_loop(),
            self._execution_loop(),
        )

    async def _bid_loop(self):
        """Poll for Open tasks and place bid commitments."""
        while True:
            try:
                await self._scan_and_bid()
            except Exception as e:
                logger.error("Bid loop error: %s", e)
            await asyncio.sleep(POLL_INTERVAL)

    async def _reveal_loop(self):
        """Poll for Revealing tasks where we have a pending bid and reveal it."""
        while True:
            try:
                await self._scan_and_reveal()
            except Exception as e:
                logger.error("Reveal loop error: %s", e)
            await asyncio.sleep(POLL_INTERVAL)

    async def _execution_loop(self):
        """Poll for Executing tasks assigned to us and run inference."""
        while True:
            try:
                await self._scan_and_execute()
            except Exception as e:
                logger.error("Execution loop error: %s", e)
            await asyncio.sleep(POLL_INTERVAL)

    # ── Registration ──────────────────────────────────────────────────────────

    async def _ensure_registered(self):
        try:
            is_staked = self.stake_vault.functions.hasMinimumStake(
                self.account.address
            ).call()
            if not is_staked:
                min_stake = self.stake_vault.functions.minStakeAmount().call()
                stake_amount = min_stake * 10  # stake 10× minimum
                self._send_tx(
                    self.stake_vault.functions.registerAndStake(),
                    value_wei=stake_amount,
                )
                logger.info("Registered with stake: %d wei", stake_amount)
            else:
                logger.info("Already registered and staked")
        except Exception as e:
            logger.error("Registration failed: %s", e)
            raise

    # ── Bid commit ────────────────────────────────────────────────────────────

    async def _scan_and_bid(self):
        task_count = self.auction_house.functions.taskCount().call()

        for task_id in range(1, task_count + 1):
            # Skip tasks we've already bid on
            if task_id in self._pending_bids:
                continue

            task = self.auction_house.functions.getTask(task_id).call()
            state = task[10]  # TaskState enum index

            # State 0 = Open
            if state != 0:
                continue

            bid_deadline = task[7]  # bidDeadline (index 7)
            if int(time.time()) >= bid_deadline:
                continue

            reserve_price = task[5]
            compute_units = task[3]
            difficulty    = task[4]

            # Fetch agent record once per task (async to avoid blocking event loop)
            loop = asyncio.get_event_loop()
            agent_record = await loop.run_in_executor(
                None,
                lambda: self.stake_vault.functions.getAgentRecord(self.account.address).call()
            )
            efficiency_score = agent_record[4] / 10_000  # normalize 0-1

            # Decide whether to bid
            bid_amount = self._calculate_bid(reserve_price, difficulty, compute_units, efficiency_score)
            if bid_amount is None:
                continue

            await self._place_bid(task_id, bid_amount)

    def _calculate_bid(
        self,
        reserve_price: int,
        difficulty: int,
        compute_units: int,
        efficiency_score: float,  # pre-fetched async, normalized 0.0-1.0
    ) -> Optional[int]:
        """
        Bid strategy:
        - Base bid = reserve_price (the floor, Vickrey-optimal starting point)
        - Scale up based on difficulty: higher difficulty = less competition = bid higher
        - Never exceed max_bid_multiplier × reserve_price
        - In challenger period (first 50 tasks), bid more aggressively to build reputation
        """
        # Higher efficiency → more confident → bid slightly higher (within limits)
        confidence = 0.7 + (efficiency_score * 0.3)

        # Difficulty premium: hard tasks have less competition, bid up slightly
        difficulty_premium = 1.0 + (difficulty / 100) * 0.15

        bid_multiplier = confidence * difficulty_premium

        # Challenger period: bid at max multiplier to win tasks and build reputation
        if self._tasks_completed_local < 50:
            bid_multiplier = self.cfg.max_bid_multiplier * 0.95

        # Cap at max_bid_multiplier
        bid_multiplier = min(bid_multiplier, self.cfg.max_bid_multiplier)

        bid_amount = int(reserve_price * bid_multiplier)

        # Check expected profit margin
        # In Vickrey: we pay second price, which is typically lower than our bid
        # Expected margin = (bid - reserve) / bid × efficiency_score
        expected_margin = ((bid_amount - reserve_price) / bid_amount) * efficiency_score
        if expected_margin < self.cfg.min_profit_margin and self._tasks_completed_local >= 50:
            logger.debug("Skipping task — insufficient expected margin %.2f", expected_margin)
            return None

        return bid_amount

    async def _place_bid(self, task_id: int, bid_amount: int):
        """Commit a sealed bid for task_id."""
        salt = self.generate_salt()
        commitment = self.make_bid_commitment(bid_amount, salt)

        try:
            # Send collateral = bid_amount (will be returned if loser)
            self._send_tx(
                self.auction_house.functions.placeBid(task_id, commitment),
                value_wei=bid_amount,
            )
            self._pending_bids[task_id] = PendingBid(
                task_id=task_id,
                amount_wei=bid_amount,
                salt=salt,
                commitment=commitment,
            )
            logger.info("Bid committed | task=%d amount=%d wei", task_id, bid_amount)
        except Exception as e:
            logger.error("Bid commit failed task=%d: %s", task_id, e)

    # ── Bid reveal ────────────────────────────────────────────────────────────

    async def _scan_and_reveal(self):
        for task_id, pending in list(self._pending_bids.items()):
            if pending.revealed:
                continue

            task = self.auction_house.functions.getTask(task_id).call()
            state = task[10]

            # State 1 = Revealing
            if state != 1:
                continue

            reveal_deadline = task[8]  # revealDeadline (index 8)
            if int(time.time()) >= reveal_deadline:
                logger.warning("Reveal deadline passed for task #%d", task_id)
                continue

            try:
                self._send_tx(
                    self.auction_house.functions.revealBid(
                        task_id,
                        pending.amount_wei,
                        pending.salt,
                    )
                )
                pending.revealed = True
                logger.info("Bid revealed | task=%d amount=%d wei", task_id, pending.amount_wei)
            except Exception as e:
                logger.error("Bid reveal failed task=%d: %s", task_id, e)

    # ── Execution ─────────────────────────────────────────────────────────────

    async def _scan_and_execute(self):
        task_count = self.auction_house.functions.taskCount().call()

        for task_id in range(1, task_count + 1):
            if task_id in self._assigned_tasks:
                continue

            task = self.auction_house.functions.getTask(task_id).call()
            state  = task[10]
            winner = task[11]

            # State 2 = Executing, and we are the winner
            if state != 2:
                continue
            if winner.lower() != self.account.address.lower():
                continue

            self._assigned_tasks.add(task_id)
            # Run execution in a separate task to not block the loop
            asyncio.create_task(self._execute_task(task_id, task))

    async def _execute_task(self, task_id: int, task: tuple):
        description      = task[2]
        compute_units    = task[3]
        execute_deadline = task[9]  # executeDeadline (index 9)

        logger.info("Executing task #%d: %s...", task_id, description[:60])

        start_time = time.time()

        try:
            # Run inference on 0G Compute
            output, tokens_used = await self.compute_inference(
                prompt=description,
                system_prompt=self.EXECUTOR_SYSTEM_PROMPT,
                temperature=0.3,
                max_tokens=min(2048, compute_units * 2),
            )

            elapsed = time.time() - start_time
            logger.info("Inference complete | task=%d tokens=%d time=%.1fs", task_id, tokens_used, elapsed)

            # Write result to 0G Storage Log
            log_entry = {
                "task_id":    task_id,
                "executor":   self.account.address,
                "output":     output,
                "tokens":     tokens_used,
                "elapsed_s":  elapsed,
                "timestamp":  int(time.time()),
            }
            storage_pointer = await self.storage_log_append(log_entry)
            if not storage_pointer:
                storage_pointer = f"local:{task_id}:{int(time.time())}"
                logger.warning("Storage write failed — using local pointer fallback")

            # Compute output hash
            output_hash = self.compute_output_hash(output)

            # Submit result on-chain (Phase 2 of two-phase commit)
            self._send_tx(
                self.auction_house.functions.submitResult(
                    task_id,
                    storage_pointer,
                    output_hash,
                    tokens_used,  # use tokens as compute units proxy
                )
            )

            self._tasks_completed_local += 1
            logger.info(
                "Task #%d completed | storage=%s | tokens=%d",
                task_id, storage_pointer, tokens_used
            )

        except Exception as e:
            logger.error("Task #%d execution failed: %s", task_id, e)
            # Don't re-add to _assigned_tasks — let the deadline slash handle it


if __name__ == "__main__":
    import sys
    index = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    agent = ExecutorAgent(executor_index=index)
    agent.start()
