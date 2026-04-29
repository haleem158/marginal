"""
watch_task.py — Live task status watcher for MARGINAL demo recording.

Shows a real-time countdown through every auction phase, so you always know
exactly what is happening and what the agents are doing next.

Usage:
    # Watch task #1 on local demo (default: localhost:8545)
    python agents/watch_task.py 1

    # Watch on mainnet
    python agents/watch_task.py 1 --rpc https://evmrpc.0g.ai

    # Watch the latest task automatically
    python agents/watch_task.py latest

Output (refreshes every second):
    ══════════════════════════════════════════════════════
      MARGINAL — Task #1 Live Status Watcher
    ══════════════════════════════════════════════════════
      Description : Explain why decentralized compute...
      Difficulty  : 72/100   Compute: 50 units
      Reserve     : 0.000050 ETH

    ──────────────────────────────────────────────────────
    📌 Phase: BID WINDOW (Open)
    ──────────────────────────────────────────────────────
      Agents are submitting sealed bid commitments.
      Bid window closes in:   00:00:18
      ████████████░░░░░░░░  60%

      Bidders so far: 1

    ──────────────────────────────────────────────────────
    ⏭  Next: Auctioneer calls startRevealPhase()
             → Agents reveal actual bid amounts
    ──────────────────────────────────────────────────────
"""

import sys
import os
import json
import time
import argparse
from pathlib import Path
from web3 import Web3
from dotenv import load_dotenv

# ── Setup ─────────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).parent.parent
load_dotenv(_ROOT / ".env", override=True)

AUCTION_HOUSE_ABI = json.loads("""
[
  {"inputs":[],"name":"taskCount","outputs":[{"type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalTasksCompleted","outputs":[{"type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"taskId","type":"uint256"}],"name":"getTask","outputs":[{"components":[
    {"name":"id","type":"uint256"},
    {"name":"submitter","type":"address"},
    {"name":"description","type":"string"},
    {"name":"computeUnitsEstimate","type":"uint256"},
    {"name":"difficultyScore","type":"uint256"},
    {"name":"reservePrice","type":"uint256"},
    {"name":"taskFee","type":"uint256"},
    {"name":"bidDeadline","type":"uint256"},
    {"name":"revealDeadline","type":"uint256"},
    {"name":"executeDeadline","type":"uint256"},
    {"name":"state","type":"uint8"},
    {"name":"winner","type":"address"},
    {"name":"winningBid","type":"uint256"},
    {"name":"highestBid","type":"uint256"},
    {"name":"computeUnitsUsed","type":"uint256"},
    {"name":"storagePointer","type":"string"},
    {"name":"outputHash","type":"bytes32"}
  ],"type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"taskId","type":"uint256"}],"name":"getTaskBidderCount","outputs":[{"type":"uint256"}],"stateMutability":"view","type":"function"}
]
""")

STATE_NAMES = {
    0: "OPEN (Bid Window)",
    1: "REVEALING (Reveal Window)",
    2: "EXECUTING (Inference Running)",
    3: "COMPLETED (Awaiting Audit Score)",
    4: "SETTLED ✓",
    5: "REFUNDED",
}

STATE_EMOJI = {
    0: "📬",
    1: "🔓",
    2: "⚙️ ",
    3: "🔍",
    4: "✅",
    5: "↩️ ",
}

NEXT_ACTION = {
    0: ("Auctioneer",  "calls startRevealPhase()",         "Agents reveal sealed bids on-chain"),
    1: ("Auctioneer",  "calls clearAuction()",             "Vickrey winner selected, executor assigned"),
    2: ("Executor",    "calls submitResult()",             "AI inference result + storage pointer stored on-chain"),
    3: ("Auditor",     "calls settleWithScore()",          "Efficiency score → rewards distributed to executor"),
    4: (None,          None,                               "Task complete — check the dashboard!"),
    5: (None,          None,                               "Task refunded — no valid bids were placed"),
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _bar(pct: float, width: int = 20) -> str:
    filled = int(width * pct)
    return "█" * filled + "░" * (width - filled)

def _fmt_time(seconds: float) -> str:
    if seconds <= 0:
        return "CLOSING..."
    m, s = divmod(int(seconds), 60)
    return f"{m:02d}:{s:02d}"

def _short_addr(addr: str) -> str:
    if not addr or addr == "0x" + "0" * 40:
        return "—"
    return f"{addr[:6]}...{addr[-4:]}"

def _clear():
    os.system("cls" if os.name == "nt" else "clear")

# ── Main watcher ──────────────────────────────────────────────────────────────

def watch(task_id: int, rpc_url: str, ah_address: str):
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        print(f"❌  Cannot connect to RPC: {rpc_url}")
        sys.exit(1)

    ah = w3.eth.contract(
        address=w3.to_checksum_address(ah_address),
        abi=AUCTION_HOUSE_ABI,
    )

    prev_state = -1

    while True:
        try:
            task = ah.functions.getTask(task_id).call()
        except Exception as e:
            print(f"⚠️  RPC error: {e}")
            time.sleep(2)
            continue

        # Unpack struct
        (tid, submitter, description, compute_est, difficulty,
         reserve, task_fee, bid_dl, reveal_dl, exec_dl,
         state, winner, winning_bid, highest_bid, compute_used,
         storage_ptr, output_hash) = task

        now = int(time.time())

        # Try to get bidder count (may not exist in all ABI versions)
        try:
            bidder_count = ah.functions.getTaskBidderCount(task_id).call()
        except Exception:
            bidder_count = "?"

        _clear()

        w = 56
        print("═" * w)
        print(f"  MARGINAL — Task #{task_id} Live Status Watcher")
        print("═" * w)
        print(f"  Description : {description[:50]}{'...' if len(description) > 50 else ''}")
        print(f"  Difficulty  : {difficulty}/100   Compute: {compute_est} units")
        print(f"  Reserve     : {w3.from_wei(reserve, 'ether'):.6f} ETH")
        print(f"  Submitter   : {_short_addr(submitter)}")
        if winner and winner != "0x" + "0" * 40:
            print(f"  Winner      : {_short_addr(winner)}   (pays {w3.from_wei(winning_bid, 'ether'):.6f} ETH)")

        print()
        print("─" * w)
        print(f"  {STATE_EMOJI[state]} Phase: {STATE_NAMES[state]}")
        print("─" * w)

        if state == 0:   # Open — bid window
            remaining = bid_dl - now
            total     = bid_dl - (now - (300 - remaining if remaining < 300 else 0))
            pct       = 1.0 - max(0, remaining) / 30 if remaining < 30 else max(0, 1 - remaining / 300)
            print(f"  Agents are submitting SEALED BID commitments.")
            print(f"  Bid window closes in:  {_fmt_time(remaining)}")
            print(f"  {_bar(pct)}  {int(pct*100)}%")
            print(f"\n  Bidders committed: {bidder_count}")

        elif state == 1:  # Revealing
            remaining = reveal_dl - now
            pct       = max(0, 1 - remaining / 20)
            print(f"  Agents are REVEALING their actual bid amounts.")
            print(f"  Reveal window closes in: {_fmt_time(remaining)}")
            print(f"  {_bar(pct)}  {int(pct*100)}%")
            print(f"\n  Bidders who revealed: {bidder_count}")

        elif state == 2:  # Executing
            remaining = exec_dl - now
            elapsed   = (exec_dl - 90) - (now - 90) if remaining < 90 else 0
            pct       = max(0, 1 - remaining / 90)
            print(f"  Winner executor is running 0G COMPUTE inference.")
            print(f"  Execution deadline in: {_fmt_time(remaining)}")
            print(f"  {_bar(pct)}  {int(pct*100)}%")
            print(f"\n  Executor: {_short_addr(winner)}")
            print(f"  Waiting for submitResult() on-chain...")

        elif state == 3:  # Completed
            print(f"  Result submitted on-chain ✓")
            print(f"  Storage pointer: {storage_ptr or '(pending)'}")
            print(f"  Compute used   : {compute_used} units")
            print(f"\n  Auditor is scoring the output...")
            print(f"  Waiting for settleWithScore() call...")

        elif state == 4:  # Settled
            print(f"  DONE! Task settled successfully.")
            print(f"  Executor: {_short_addr(winner)}")
            print(f"  Storage : {storage_ptr}")
            print(f"  Compute : {compute_used} units")
            print(f"\n  Check the dashboard for updated leaderboard & efficiency score.")

        elif state == 5:  # Refunded
            print(f"  Task was refunded — no valid bids were revealed.")

        # Next action banner
        actor, action, description_next = NEXT_ACTION[state]
        print()
        print("─" * w)
        if actor:
            print(f"  ⏭  Next: {actor} {action}")
            print(f"           → {description_next}")
        else:
            print(f"  ✓  {description_next}")
        print("─" * w)
        print(f"\n  Chain: {rpc_url}   Block: {w3.eth.block_number}")
        print(f"  Refreshing every 1s... (Ctrl+C to exit)")

        if state in (4, 5):
            print("\n  Watching complete. Press Ctrl+C to exit.")
            # Stay alive so screen stays up for recording
            time.sleep(5)
            continue

        time.sleep(1)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="MARGINAL live task watcher")
    parser.add_argument(
        "task_id",
        help="Task ID to watch, or 'latest' to pick the most recent",
    )
    parser.add_argument(
        "--rpc",
        default=os.getenv("OG_RPC_URL", "http://127.0.0.1:8545"),
        help="RPC URL (default: OG_RPC_URL env or http://127.0.0.1:8545)",
    )
    parser.add_argument(
        "--contract",
        default=os.getenv("AUCTION_HOUSE_ADDRESS", ""),
        help="AuctionHouse contract address (default: AUCTION_HOUSE_ADDRESS env)",
    )
    args = parser.parse_args()

    if not args.contract:
        # Try demo-deployments.json
        demo_path = _ROOT / "demo-deployments.json"
        if demo_path.exists():
            info = json.loads(demo_path.read_text())
            args.contract = info["contracts"].get("AuctionHouseDemo", "")
        if not args.contract:
            print("❌  No contract address. Set AUCTION_HOUSE_ADDRESS in .env or pass --contract")
            sys.exit(1)

    w3 = Web3(Web3.HTTPProvider(args.rpc))
    ah = w3.eth.contract(
        address=w3.to_checksum_address(args.contract),
        abi=AUCTION_HOUSE_ABI,
    )

    if args.task_id == "latest":
        task_id = ah.functions.taskCount().call()
        if task_id == 0:
            print("❌  No tasks on-chain yet. Submit one first.")
            sys.exit(1)
        print(f"👀 Watching latest task: #{task_id}")
    else:
        task_id = int(args.task_id)

    watch(task_id, args.rpc, args.contract)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nWatcher stopped.")
