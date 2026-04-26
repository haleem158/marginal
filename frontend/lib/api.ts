/**
 * api.ts — REST client for the MARGINAL Auctioneer FastAPI server.
 * Base URL defaults to localhost:8000; override via NEXT_PUBLIC_AUCTIONEER_URL.
 */

const BASE = (process.env.NEXT_PUBLIC_AUCTIONEER_URL ?? "http://localhost:8000").replace(/\/$/, "");

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

// ── Fetch helper ─────────────────────────────────────────────────────────────

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
};
