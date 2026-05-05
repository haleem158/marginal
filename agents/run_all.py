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
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

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

    # ── Combined app: one server, one port ──────────────────────────────────
    app = FastAPI(title="MARGINAL Backend", docs_url=None, openapi_url=None)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Top-level health route (owned by this app, never conflicts)
    @app.get("/health")
    async def health():
        return {"status": "ok"}

    # Include auctioneer routes at root and indexer routes at /indexer
    app.include_router(auctioneer.app.router)

    indexer_app = indexer.build_api()
    app.include_router(indexer_app.router, prefix="/indexer")

    port = int(os.getenv("PORT", 8080))
    logger.info("Starting single uvicorn on :%d", port)

    # Run indexer event polling as a background asyncio task — decoupled from server
    event_task = asyncio.ensure_future(indexer._event_loop())

    def on_event_task_done(fut: asyncio.Future):
        if not fut.cancelled() and fut.exception():
            logger.error("Indexer event loop crashed: %s", fut.exception(), exc_info=fut.exception())

    event_task.add_done_callback(on_event_task_done)

    try:
        config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="info")
        server = uvicorn.Server(config)
        await server.serve()
    finally:
        event_task.cancel()
        try:
            await event_task
        except asyncio.CancelledError:
            pass
        logger.info("Shutdown complete.")


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
