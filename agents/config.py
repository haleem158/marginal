"""
config.py — Centralised configuration for all MARGINAL agents.
Loads from .env and validates required fields at import time.
"""
import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

# Always resolve to the project root .env, regardless of the process CWD.
# override=True ensures .env values win over any stale shell environment variables.
_DOTENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(_DOTENV_PATH, override=True)


def _require(key: str) -> str:
    val = os.getenv(key)
    if not val:
        raise EnvironmentError(f"Required env var {key!r} is not set. Check your .env file.")
    return val


@dataclass(frozen=True)
class Config:
    # ── 0G Chain ──────────────────────────────────────────────────────────────
    og_rpc_url: str
    chain_id: int
    auction_house_address: str
    stake_vault_address: str
    marginal_nft_address: str

    # ── 0G Compute ────────────────────────────────────────────────────────────
    compute_api_key: str
    compute_base_url: str
    compute_model: str

    # ── 0G Storage ────────────────────────────────────────────────────────────
    storage_node_url: str
    kv_bucket: str
    log_stream_id: str

    # ── Agent identity ────────────────────────────────────────────────────────
    private_key: str
    agent_id: str

    # ── Economic parameters ───────────────────────────────────────────────────
    min_profit_margin: float   # minimum expected ROI before bidding
    max_bid_multiplier: float  # max bid = reserve_price * this
    auditor_count: int         # number of independent auditor calls for consensus


def load_config(role: str = "executor", executor_index: int = 1) -> Config:
    """
    Load config for the given agent role.
    role: "executor" | "auditor" | "auctioneer" | "memory_indexer"
    executor_index: for executors, which key slot to use (1-based).
        Reads EXECUTOR_PRIVATE_KEY_<N> first, falls back to EXECUTOR_PRIVATE_KEY.
    """
    if role == "executor":
        # Try indexed key first: EXECUTOR_PRIVATE_KEY_1, _2, _3 …
        pk_env_indexed = f"EXECUTOR_PRIVATE_KEY_{executor_index}"
        if os.getenv(pk_env_indexed):
            pk_env = pk_env_indexed
        else:
            pk_env = "EXECUTOR_PRIVATE_KEY"  # legacy fallback
    else:
        key_map = {
            "auditor":        "AUDITOR_PRIVATE_KEY",
            "auctioneer":     "AUCTIONEER_PRIVATE_KEY",
            "memory_indexer": "AUCTIONEER_PRIVATE_KEY",
        }
        pk_env = key_map.get(role, "EXECUTOR_PRIVATE_KEY")

    return Config(
        og_rpc_url=os.getenv("OG_RPC_URL") or os.getenv("OG_MAINNET_RPC", "https://evmrpc.0g.ai"),
        chain_id=int(os.getenv("NEXT_PUBLIC_CHAIN_ID", "16661")),
        auction_house_address=_require("AUCTION_HOUSE_ADDRESS"),
        stake_vault_address=_require("STAKE_VAULT_ADDRESS"),
        marginal_nft_address=_require("MARGINAL_NFT_ADDRESS"),
        compute_api_key=os.getenv("OG_COMPUTE_API_KEY", ""),
        compute_base_url=os.getenv("OG_COMPUTE_BASE_URL", "https://api.0g.ai/v1"),
        compute_model=os.getenv("OG_COMPUTE_MODEL", "qwen3.6-plus"),
        storage_node_url=os.getenv("OG_STORAGE_NODE_URL", "https://storage.0g.ai"),
        kv_bucket=os.getenv("OG_KV_BUCKET", "marginal-agent-state"),
        log_stream_id=os.getenv("OG_LOG_STREAM_ID", "marginal-task-log"),
        private_key=_require(pk_env),
        agent_id=os.getenv("AGENT_ID", f"{role}-{executor_index:03d}"),
        min_profit_margin=float(os.getenv("MIN_PROFIT_MARGIN", "0.05")),
        max_bid_multiplier=float(os.getenv("MAX_BID_MULTIPLIER", "1.3")),
        auditor_count=int(os.getenv("AUDITOR_COUNT", "3")),
    )
