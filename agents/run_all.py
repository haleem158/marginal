"""
run_all.py — Launch all MARGINAL agents in separate processes.

Usage:
    python agents/run_all.py

Launches:
    - Auctioneer on port 8000
    - Memory Indexer cache API on port 8001  
    - Executor (2 instances)
    - Auditor
"""
import subprocess
import sys
import os
import time
import signal
from pathlib import Path

AGENTS_DIR = Path(__file__).parent

processes = []


def launch(script: str, label: str) -> subprocess.Popen:
    proc = subprocess.Popen(
        [sys.executable, str(AGENTS_DIR / script)],
        cwd=str(AGENTS_DIR),
        env={**os.environ},
    )
    print(f"✅ {label} started (PID {proc.pid})")
    return proc


def shutdown(sig, frame):
    print("\nShutting down all agents...")
    for proc in processes:
        proc.terminate()
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    processes.append(launch("auctioneer.py",     "Auctioneer      (port 8000)"))
    time.sleep(2)
    processes.append(launch("memory_indexer.py", "Memory Indexer  (port 8001)"))
    time.sleep(1)
    processes.append(launch("executor.py",       "Executor #1"))
    time.sleep(1)
    processes.append(launch("executor.py",       "Executor #2"))
    time.sleep(1)
    processes.append(launch("auditor.py",        "Auditor"))

    print("\n🚀 All MARGINAL agents running. Press Ctrl+C to stop.\n")

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
