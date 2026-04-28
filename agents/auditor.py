"""
auditor.py — Auditor Agent for MARGINAL.

Responsibilities:
  1. Watch for TaskCompleted events on AuctionHouse.
  2. Fetch the executor's output from 0G Storage Log.
  3. Score output quality using 0G Compute (independently from executor).
  4. Run N independent scoring calls and aggregate via median.
  5. Apply difficulty-adjusted scoring curve.
  6. Submit consensus efficiency score to Auctioneer's /tasks/{id}/settle endpoint.

Efficiency Score Formula:
  raw_quality  = LLM rubric score (0-100)
  difficulty_adj = 1 + (difficulty - 50) / 200   [±25% curve]
  compute_eff  = min(1.0, expected_units / actual_units)
  efficiency   = raw_quality × difficulty_adj × compute_eff

This produces a score that rewards high quality on hard tasks AND low compute usage.
Score ≥ 60 → reward. Score < 60 → slash.

Three independent Auditor instances call different temperatures to prevent 
single-model bias. The median score is the ground truth.
"""
import asyncio
import logging
import os
import time
import statistics
import aiohttp
from typing import Optional

from config import load_config
from base_agent import BaseAgent

logger = logging.getLogger("marginal.auditor")

POLL_INTERVAL  = 12   # seconds
AUCTIONEER_URL = "http://localhost:8000"  # Auctioneer REST API

SCORING_SYSTEM_PROMPT = """You are an impartial quality auditor for AI-generated outputs.

Score the following AI response on this rubric (integer 0-100):
- Accuracy & correctness: 0-30 pts
- Completeness (does it fully address the task): 0-25 pts  
- Clarity & coherence: 0-20 pts
- Appropriate length (not padding, not truncated): 0-15 pts
- Format quality (structure, code correctness if applicable): 0-10 pts

IMPORTANT: Respond with ONLY a JSON object: {"score": <integer 0-100>, "reasoning": "<one sentence>"}
No other text."""


class AuditorAgent(BaseAgent):

    def __init__(self):
        cfg = load_config("auditor")
        super().__init__(cfg, "auditor")
        self._audited_tasks: set[int] = set()

    # ── Main loop ─────────────────────────────────────────────────────────────

    async def run(self):
        logger.info("Auditor agent starting...")
        while True:
            try:
                await self._scan_completed_tasks()
            except Exception as e:
                logger.error("Auditor loop error: %s", e)
            await asyncio.sleep(POLL_INTERVAL)

    async def _scan_completed_tasks(self):
        task_count = self.auction_house.functions.taskCount().call()

        for task_id in range(1, task_count + 1):
            if task_id in self._audited_tasks:
                continue

            task = self.auction_house.functions.getTask(task_id).call()
            state = task[10]

            # State 4 = Completed (result submitted, awaiting score)
            if state != 4:
                continue

            self._audited_tasks.add(task_id)
            asyncio.create_task(self._audit_task(task_id, task))

    async def _audit_task(self, task_id: int, task: tuple):
        description       = task[2]
        compute_estimated = task[3]
        difficulty        = task[4]
        compute_used      = task[14]  # computeUnitsUsed (index 14)
        storage_pointer   = task[15]  # storagePointer (index 15)

        logger.info("Auditing task #%d...", task_id)

        # Step 1: Fetch output from 0G Storage
        output_text = await self._fetch_output(storage_pointer, task_id)
        if output_text is None:
            logger.error("Cannot fetch output for task #%d — assigning score 0", task_id)
            await self._submit_score(task_id, 0)
            return

        # Step 2: Score quality via N independent 0G Compute calls
        raw_scores = await self._multi_score(description, output_text)

        if not raw_scores:
            logger.error("No valid scores for task #%d — assigning score 30", task_id)
            await self._submit_score(task_id, 30)
            return

        # Step 3: Aggregate via median (resistant to outlier manipulation)
        median_quality = int(statistics.median(raw_scores))
        logger.info(
            "Task #%d quality scores: %s → median=%d",
            task_id, raw_scores, median_quality
        )

        # Step 4: Apply difficulty-adjusted efficiency formula
        efficiency = self._compute_efficiency_score(
            quality=median_quality,
            difficulty=difficulty,
            compute_estimated=compute_estimated,
            compute_used=compute_used,
        )

        logger.info(
            "Task #%d efficiency score: %d (quality=%d, difficulty=%d, compute_ratio=%.2f)",
            task_id, efficiency, median_quality, difficulty,
            compute_estimated / max(1, compute_used),
        )

        # Step 5: Submit score via Auctioneer API (which calls settleWithScore on-chain)
        await self._submit_score(task_id, efficiency)

    # ── Scoring ───────────────────────────────────────────────────────────────

    async def _multi_score(self, task_description: str, output: str) -> list[int]:
        """
        Run N independent scoring calls with different temperatures.
        Returns list of valid integer scores.
        Median of these is the final quality score.
        """
        temperatures = [0.0, 0.3, 0.5]  # different temperatures → different "judge" perspectives
        n_calls = min(self.cfg.auditor_count, len(temperatures))

        tasks = [
            self._single_score(task_description, output, temperatures[i])
            for i in range(n_calls)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        scores = []
        for r in results:
            if isinstance(r, Exception):
                logger.warning("Scoring call failed: %s", r)
                continue
            if r is not None:
                scores.append(r)

        return scores

    async def _single_score(
        self, task_description: str, output: str, temperature: float
    ) -> Optional[int]:
        """Run one scoring call via 0G Compute."""
        import json as _json

        prompt = (
            f"ORIGINAL TASK:\n{task_description}\n\n"
            f"AI RESPONSE:\n{output}\n\n"
            "Score this response using the rubric."
        )
        try:
            response_text, _ = await self.compute_inference(
                prompt=prompt,
                system_prompt=SCORING_SYSTEM_PROMPT,
                temperature=temperature,
                max_tokens=128,
            )
            data = _json.loads(response_text.strip())
            score = int(data.get("score", 0))
            score = max(0, min(100, score))
            return score
        except Exception as e:
            logger.warning("Single score failed (temp=%.1f): %s", temperature, e)
            return None

    def _compute_efficiency_score(
        self,
        quality: int,
        difficulty: int,
        compute_estimated: int,
        compute_used: int,
    ) -> int:
        """
        Difficulty-adjusted efficiency score.

        - Easy tasks (difficulty < 50) give smaller base reward even at high quality.
        - Hard tasks (difficulty > 50) amplify reward.
        - Compute efficiency: using fewer units than estimated is good.
        - Final score is clamped to [0, 100].
        """
        if compute_used == 0:
            compute_used = compute_estimated  # avoid division by zero

        # Difficulty multiplier: 0.75× at difficulty=1, 1.0× at difficulty=50, 1.25× at difficulty=100
        difficulty_multiplier = 0.75 + (difficulty / 200)

        # Compute efficiency: ratio of expected to actual (capped at 1.5×)
        compute_ratio = min(1.5, compute_estimated / compute_used)
        # Normalize: ratio=1.0 → 1.0, ratio=1.5 → 1.1, ratio=0.5 → 0.85
        compute_multiplier = 0.85 + (compute_ratio - 0.5) * 0.3

        raw_efficiency = quality * difficulty_multiplier * compute_multiplier

        return max(0, min(100, round(raw_efficiency)))

    # ── Storage & API ─────────────────────────────────────────────────────────

    async def _fetch_output(self, storage_pointer: str, task_id: int) -> Optional[str]:
        """Fetch executor's output from 0G Storage Log or Memory Indexer."""
        if not storage_pointer:
            logger.warning("Task #%d has empty storage pointer", task_id)
            return None

        if storage_pointer.startswith("local:"):
            logger.warning("Task #%d used local fallback pointer — cannot verify output", task_id)
            return None

        try:
            entry = await self.storage_log_read(storage_pointer)
            if entry:
                return entry.get("output")
        except Exception as e:
            logger.error("Storage fetch failed for pointer=%s: %s", storage_pointer, e)

        return None

    async def _submit_score(self, task_id: int, score: int):
        """POST efficiency score to Auctioneer API which calls settleWithScore on-chain.
        
        Requires SETTLE_API_KEY env var to match the Auctioneer's configured secret.
        This prevents unauthenticated score injection from third parties.
        """
        settle_key = os.getenv("SETTLE_API_KEY", "")
        url = f"{AUCTIONEER_URL}/tasks/{task_id}/settle?efficiency_score={score}"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers={"X-Settle-Key": settle_key},
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        logger.info(
                            "Task #%d settled | score=%d | tx=%s",
                            task_id, score, result.get("tx_hash", "?")
                        )
                    else:
                        body = await resp.text()
                        logger.error("Settle API failed for task #%d: %d %s", task_id, resp.status, body)
        except Exception as e:
            # Auctioneer is down — direct on-chain fallback only works if THIS wallet is the contract owner
            logger.error(
                "Settle submission failed for task #%d: %s — "
                "ensure Auctioneer is running or this wallet (%s) is the contract owner",
                task_id, e, self.account.address
            )
            try:
                self._send_tx(
                    self.auction_house.functions.settleWithScore(task_id, score)
                )
                logger.info("Task #%d settled directly on-chain (API fallback)", task_id)
            except Exception as e2:
                logger.error(
                    "Direct settlement also failed for task #%d: %s — task is stranded in Completed state",
                    task_id, e2
                )


if __name__ == "__main__":
    agent = AuditorAgent()
    agent.start()
