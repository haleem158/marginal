"""
config.py — Centralised configuration for all MARGINAL agents.
Loads from .env and validates required fields at import time.
"""
import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


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


def load_config(role: str = "executor") -> Config:
    """
    Load config for the given agent role.
    role: "executor" | "auditor" | "auctioneer" | "memory_indexer"
    """
    key_map = {
        "executor":       "EXECUTOR_PRIVATE_KEY",
        "auditor":        "AUDITOR_PRIVATE_KEY",
        "auctioneer":     "AUCTIONEER_PRIVATE_KEY",
        "memory_indexer": "AUCTIONEER_PRIVATE_KEY",  # indexer uses auctioneer key
    }
    pk_env = key_map.get(role, "EXECUTOR_PRIVATE_KEY")

    return Config(
        og_rpc_url=os.getenv("OG_TESTNET_RPC", "https://evmrpc-testnet.0g.ai"),
        chain_id=int(os.getenv("NEXT_PUBLIC_CHAIN_ID", "16600")),
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
        agent_id=os.getenv("AGENT_ID", f"{role}-001"),
        min_profit_margin=float(os.getenv("MIN_PROFIT_MARGIN", "0.05")),
        max_bid_multiplier=float(os.getenv("MAX_BID_MULTIPLIER", "1.3")),
        auditor_count=int(os.getenv("AUDITOR_COUNT", "3")),
    )
