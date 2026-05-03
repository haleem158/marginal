"""
run_all.py — Run all MARGINAL API services in a single uvicorn server.

Mounts auctioneer and indexer as FastAPI sub-applications on the gateway:
  /          → auctioneer routes
  /indexer/  → indexer routes

One port ($PORT / 8080), no inter-process communication, no port conflicts.
"""
import asyncio
import logging
import os
import sys
import subprocess
import signal
from pathlib import Path
from dotenv import load_dotenv

_DOTENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(_DOTENV_PATH, override=True)

AGENTS_DIR = Path(__file__).parent
sys.path.insert(0, str(AGENTS_DIR))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
)
logger = logging.getLogger("marginal.run_all")

extra_procs = []


def discover_executor_indices() -> list[int]:
    indices = [i for i in range(1, 20) if os.getenv(f"EXECUTOR_PRIVATE_KEY_{i}")]
    if not indices and os.getenv("EXECUTOR_PRIVATE_KEY"):
        indices = [1]
    return indices


def launch_subprocess(script: str, label: str, *args: str) -> subprocess.Popen:
    proc = subprocess.Popen(
        [sys.executable, "-u", str(AGENTS_DIR / script), *args],
        cwd=str(AGENTS_DIR),
        env={**os.environ},
    )
    logger.info("%s started (PID %d)", label, proc.pid)
    return proc


async def main():
    from auctioneer import AuctioneerAgent
    from memory_indexer import MemoryIndexerAgent
    import uvicorn

    logger.info("Initialising AuctioneerAgent...")
    auctioneer = AuctioneerAgent()
    logger.info("Initialising MemoryIndexerAgent...")
    indexer = MemoryIndexerAgent()

    # Fetch initial block non-blockingly
    loop = asyncio.get_event_loop()
    try:
        indexer._last_block = await loop.run_in_executor(
            None, lambda: indexer.w3.eth.block_number
        )
        logger.info("Memory Indexer starting at block %d", indexer._last_block)
    except Exception as e:
        logger.warning("Could not fetch initial block: %s", e)

    # Build indexer FastAPI sub-app and include its routes into auctioneer.app
    # under the /indexer prefix.  include_router() is flat and never conflicts.
    indexer_app = indexer.build_api()
    auctioneer.app.include_router(indexer_app.router, prefix="/indexer", tags=["indexer"])

    port = int(os.getenv("PORT", 8080))
    logger.info("Starting single uvicorn on :%d (auctioneer + indexer)", port)

    config = uvicorn.Config(auctioneer.app, host="0.0.0.0", port=port, log_level="info")
    server = uvicorn.Server(config)

    # Run uvicorn + indexer event loop concurrently
    await asyncio.gather(
        server.serve(),
        indexer._event_loop(),
    )


def shutdown(sig, frame):
    for p in extra_procs:
        p.terminate()
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    run_mode = os.getenv("RUN_MODE", "full").lower()
    if run_mode == "full":
        for idx in discover_executor_indices():
            extra_procs.append(launch_subprocess("executor.py", f"Executor #{idx}", str(idx)))
        extra_procs.append(launch_subprocess("auditor.py", "Auditor"))

    asyncio.run(main())



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
        stdout=None,   # inherit — goes directly to Railway logs
        stderr=None,   # inherit — crash tracebacks visible immediately
    )
    print(f"✅ {label} started (PID {proc.pid})", flush=True)
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
        tick = 0
        while True:
            time.sleep(5)
            tick += 1
            dead = [p for p in processes if p.poll() is not None]
            for proc in dead:
                print(f"⚠️  Process {proc.pid} exited with code {proc.returncode}", flush=True)
                processes.remove(proc)
            if not processes:
                print("All agents have exited. Shutting down.", flush=True)
                break
            # Heartbeat every 60s so Railway logs show the container is alive
            if tick % 12 == 0:
                alive = [p.pid for p in processes]
                print(f"[heartbeat] alive PIDs: {alive}", flush=True)
    except KeyboardInterrupt:
        shutdown(None, None)
