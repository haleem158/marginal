"""
run_all.py — Launch all MARGINAL agents in separate processes.

Usage:
    python agents/run_all.py

Executor instances are launched automatically based on how many
EXECUTOR_PRIVATE_KEY_<N> entries exist in .env (e.g. _1, _2, _3).
Falls back to a single instance using EXECUTOR_PRIVATE_KEY if no
indexed keys are found.

Launches:
    - Auctioneer on port 8000
    - Memory Indexer cache API on port 8001
    - Executor × N  (one per EXECUTOR_PRIVATE_KEY_<N>)
    - Auditor
"""
import subprocess
import sys
import os
import time
import signal
from pathlib import Path
from dotenv import load_dotenv

# Explicit path so run_all finds .env regardless of how/where it is invoked.
_DOTENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(_DOTENV_PATH, override=True)

AGENTS_DIR = Path(__file__).parent

processes = []


def discover_executor_indices() -> list[int]:
    """Return sorted list of executor key indices found in the environment.
    E.g. if EXECUTOR_PRIVATE_KEY_1 and EXECUTOR_PRIVATE_KEY_3 are set, returns [1, 3].
    Falls back to [1] using EXECUTOR_PRIVATE_KEY if no indexed keys found.
    """
    indices = []
    for i in range(1, 20):  # support up to 19 executor wallets
        if os.getenv(f"EXECUTOR_PRIVATE_KEY_{i}"):
            indices.append(i)
    if not indices and os.getenv("EXECUTOR_PRIVATE_KEY"):
        indices = [1]
    return indices


def launch(script: str, label: str, *args: str) -> subprocess.Popen:
    proc = subprocess.Popen(
        [sys.executable, "-u", str(AGENTS_DIR / script), *args],
        cwd=str(AGENTS_DIR),
        env={**os.environ},
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        bufsize=1,
        text=True,
    )
    print(f"✅ {label} started (PID {proc.pid})")

    # Stream each agent's output prefixed with its label so you can follow the flow
    prefix = label.split("(")[0].strip().ljust(20)
    import threading
    def _stream():
        for line in proc.stdout:  # type: ignore[union-attr]
            print(f"[{prefix}] {line}", end="")
    threading.Thread(target=_stream, daemon=True).start()

    return proc


def shutdown(sig, frame):
    print("\nShutting down all agents...")
    for proc in processes:
        proc.terminate()
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # RUN_MODE=api → only gateway + auctioneer + indexer (fits in 512MB on Render free tier)
    # RUN_MODE=full (default) → all agents including executor and auditor
    run_mode = os.getenv("RUN_MODE", "full").lower()

    processes.append(launch("auctioneer.py",     "Auctioneer      (port 8000)"))
    time.sleep(2)
    processes.append(launch("memory_indexer.py", "Memory Indexer  (port 8001)"))
    time.sleep(1)

    # Gateway exposes both APIs on a single public port ($PORT, default 8080).
    # Required for Railway / cloud deployments that only expose one port.
    processes.append(launch("gateway.py", "Gateway         (port $PORT)"))
    time.sleep(1)

    if run_mode == "api":
        print(f"\n🚀 MARGINAL running in API-only mode (no executor/auditor). Press Ctrl+C to stop.\n")
    else:
        executor_indices = discover_executor_indices()
        for i, idx in enumerate(executor_indices):
            processes.append(launch("executor.py", f"Executor #{idx}  (wallet key {idx})", str(idx)))
            time.sleep(1)

        processes.append(launch("auditor.py", "Auditor"))
        print(f"\n🚀 MARGINAL running: {len(executor_indices)} executor(s). Press Ctrl+C to stop.\n")

    try:
        while True:
            time.sleep(5)
            dead = [p for p in processes if p.poll() is not None]
            for proc in dead:
                print(f"⚠️  Process {proc.pid} exited with code {proc.returncode}")
                processes.remove(proc)
            if not processes:
                print("All agents have exited. Shutting down.")
                break
    except KeyboardInterrupt:
        shutdown(None, None)
