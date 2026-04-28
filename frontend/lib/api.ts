/**
 * api.ts — REST client for the MARGINAL Auctioneer (port 8000) and
 * Memory Indexer (port 8001) FastAPI servers.
 */

const BASE    = (process.env.NEXT_PUBLIC_AUCTIONEER_URL ?? "http://localhost:8000").replace(/\/$/, "");
const IDX_BASE = (process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:8001").replace(/\/$/, "");

// ── Types mirrored from auctioneer.py ────────────────────────────────────────

export interface TaskSubmitRequest {
  description: string;
  submitter_address: string;
}

export interface TaskSubmitResponse {
  task_id: number;
  compute_units: number;
  difficulty_score: number;
  reserve_price_wei: string;
  bid_deadline: number;
  tx_hash: string;
}

export interface TaskState {
  id: number;
  submitter: string;
  description: string;
  computeUnits: number;
  difficulty: number;
  reservePrice: string;
  bidDeadline: number;
  revealDeadline: number;
  executeDeadline: number;
  /** 0=Open, 1=Revealing, 2=Executing, 3=Completed, 4=Settled, 5=Refunded */
  state: number;
  winner: string;
  winningBid: string;
  highestBid: string;
  bidCount: number;
  computeUnitsUsed?: number;
  storagePointer?: string;
}

export interface ActiveTasksResponse {
  active_task_ids: number[];
  tasks: TaskState[];
}

export interface HealthResponse {
  status: string;
  block: number;
  agent: string;
}

export interface RecentEvent {
  id: number;
  type: string;
  taskId: string;
  agent: string;
  amount: number;
  state: number;
  description: string;
}

export interface RecentEventsResponse {
  events: RecentEvent[];
}



export interface TaskEstimate {
  compute_units: number;
  difficulty: number;
  reserve_price_wei: string;
  task_fee_wei: string;
  total_cost_wei: string;
  total_cost_a0gi: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const api = {
  /** Health check — use to detect if the Auctioneer is reachable. */
  health(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },

  /**
   * Submit a new AI task. The Auctioneer estimates compute, submits on-chain,
   * and returns the task ID + reserve price so the UI can show the result.
   */
  submitTask(body: TaskSubmitRequest): Promise<TaskSubmitResponse> {
    return request<TaskSubmitResponse>("/tasks/submit", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * Fetch all currently-active (Open / Revealing / Executing) tasks with
   * their full details. Returns an empty list if the Auctioneer is offline.
   */
  async getActiveTasks(): Promise<ActiveTasksResponse> {
    return request<ActiveTasksResponse>("/tasks/active");
  },

  /** Fetch a single task by ID. */
  getTask(id: number): Promise<TaskState> {
    return request<TaskState>(`/tasks/${id}`);
  },

  /** Fetch the last 20 tasks as live feed events. */
  getRecentEvents(): Promise<RecentEventsResponse> {
    return request<RecentEventsResponse>("/tasks/recent");
  },

  /**
   * Estimate compute cost without submitting on-chain.
   * Use for live cost preview as the user types.
   */
  estimateTask(body: TaskSubmitRequest): Promise<TaskEstimate> {
    return request<TaskEstimate>("/tasks/estimate", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

// ── Memory Indexer client (port 8001) ─────────────────────────────────────

function idxRequest<T>(path: string): Promise<T> {
  return fetch(`${IDX_BASE}${path}`)
    .then((res) => {
      if (!res.ok) throw new Error(`Indexer ${res.status}`);
      return res.json() as Promise<T>;
    });
}

export interface SettlementRecord {
  task_id: number;
  executor: string;
  description: string;
  compute_estimated: number;
  difficulty: number;
  winning_bid_wei: string;
  compute_used: number;
  efficiency_score: number;
  storage_pointer: string;
  timestamp: number;
  block: number;
}

export interface IndexerStats {
  total_tasks_completed: number;
  total_settled: number;
  current_epoch: number;
  indexed_agents: number;
  log_entries: number;
  last_block: number;
}

export interface IndexerAgent {
  address: string;
  total_stake_wei: string;
  lifetime_rewards_wei: string;
  lifetime_slashed_wei: string;
  tasks_completed: number;
  /** 0–10000, divide by 10000 for 0.0–1.0 */
  efficiency_score: number;
  nft_token_id: number;
  last_updated: number;
  latest_log_pointer?: string;
  last_task_state?: string;
}

export interface AgentHistoryPoint {
  epoch: number;
  score: number;
  task_id: number;
  timestamp: number;
}

export interface NetworkMetrics {
  avg_efficiency: number;
  total_compute_used: number;
  total_rewards_a0gi: number;
  total_slashed_a0gi: number;
  active_agents: number;
  tasks_this_epoch: number;
}

export const indexer = {
  /** All settled tasks — newest first. */
  getSettlements(): Promise<SettlementRecord[]> {
    return idxRequest<SettlementRecord[]>("/settlements");
  },

  /** All known agents with live KV state. */
  getAgents(): Promise<IndexerAgent[]> {
    return idxRequest<IndexerAgent[]>("/agents");
  },

  /** Single agent by address — fetches from chain if not cached. */
  getAgent(address: string): Promise<IndexerAgent> {
    return idxRequest<IndexerAgent>(`/agents/${address}`);
  },

  /** Per-agent efficiency history (last N settled tasks for that agent). */
  getAgentHistory(address: string): Promise<AgentHistoryPoint[]> {
    return idxRequest<AgentHistoryPoint[]>(`/agents/${address}/history`);
  },

  /** Network stats (task count, epoch, etc.). */
  getStats(): Promise<IndexerStats> {
    return idxRequest<IndexerStats>("/stats");
  },

  /** Aggregate network metrics for the dashboard. */
  getMetrics(): Promise<NetworkMetrics> {
    return idxRequest<NetworkMetrics>("/metrics");
  },
};
