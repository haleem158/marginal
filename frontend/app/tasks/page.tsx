"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, ChevronDown, ExternalLink, Radio } from "lucide-react";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { TaskSubmitResponse, TaskEstimate } from "@/lib/api";
import { OG_EXPLORER } from "@/lib/contracts";

type SubmitState = "idle" | "estimating" | "opening" | "done" | "error";

const stateMessages: Record<SubmitState, string> = {
  idle:       "Open Auction →",
  estimating: "Estimating compute...",
  opening:    "Opening on-chain auction...",
  done:       "Auction Opened!",
  error:      "Submission Failed",
};

// On-chain task states 0-5
const TASK_PHASES = [
  { state: 0, label: "Bid Phase",    desc: "Executors are committing bids" },
  { state: 1, label: "Reveal Phase", desc: "Bids are being revealed" },
  { state: 2, label: "Executing",    desc: "Winner is running inference" },
  { state: 3, label: "Scored",       desc: "Auditor has evaluated output" },
  { state: 4, label: "Settled",      desc: "Reward / slash distributed" },
  { state: 5, label: "Refunded",     desc: "No bids met reserve price" },
];

interface TaskStatus {
  state: number;
  winner?: string;
  winningBid?: number;
  computeUsed?: number;
  storagePointer?: string;
  bidCount?: number;
  bidDeadline?: number;
  revealDeadline?: number;
}

const recentTasks = [
  { id: "4821", status: "live",   agent: "0x7f3a...c291", score: 0.94, cost: 142, time: "2m ago" },
  { id: "4815", status: "scored", agent: "0xf7b5...d2e8", score: 0.88, cost: 94,  time: "15m ago" },
  { id: "4809", status: "slashed",agent: "0x2e8c...4f17", score: 0.45, cost: 47,  time: "1h ago" },
];

export default function TasksPage() {
  const { address } = useAccount();

  const [task,         setTask]         = useState("");
  const [model,        setModel]        = useState<"qwen3.6-plus" | "GLM-5-FP8">("qwen3.6-plus");
  const [budget,       setBudget]       = useState("5000");
  const [reserveOpen,  setReserveOpen]  = useState(false);
  const [reserve,      setReserve]      = useState("0.70");
  const [submitState,  setSubmitState]  = useState<SubmitState>("idle");
  const [errorMsg,     setErrorMsg]     = useState("");
  const [result,       setResult]       = useState<TaskSubmitResponse | null>(null);
  const [taskStatus,   setTaskStatus]   = useState<TaskStatus | null>(null);
  const [estimate,     setEstimate]     = useState<TaskEstimate | null>(null);
  const [estimating,   setEstimating]   = useState(false);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const estimateRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll the task state every 5 s once we have a task ID
  useEffect(() => {
    if (!result?.task_id) return;

    async function poll() {
      try {
        const t = await api.getTask(result!.task_id);
        setTaskStatus({
          state:          t.state,
          winner:         t.winner,
          winningBid:     t.winningBid ? Number(BigInt(t.winningBid)) / 1e18 : undefined,
          computeUsed:    t.computeUnitsUsed,
          storagePointer: t.storagePointer,
          bidCount:       t.bidCount,
          bidDeadline:    t.bidDeadline,
          revealDeadline: t.revealDeadline,
        });
        // Stop polling once settled or refunded
        if (t.state >= 4 && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        // silently ignore — API may be momentarily unavailable
      }
    }

    poll();
    pollRef.current = setInterval(poll, 5_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [result?.task_id]);

  const estimatedTokens = Math.round(task.length * 1.3);
  const estimatedCost   = estimate ? estimate.total_cost_a0gi : Math.round(estimatedTokens * 0.034) / 1000;

  // Debounced cost estimate — calls /tasks/estimate 1s after user stops typing
  const triggerEstimate = useCallback((description: string) => {
    if (estimateRef.current) clearTimeout(estimateRef.current);
    if (description.trim().length < 20) { setEstimate(null); return; }
    estimateRef.current = setTimeout(async () => {
      try {
        setEstimating(true);
        const est = await api.estimateTask({
          description: description.trim(),
          submitter_address: "0x0000000000000000000000000000000000000000",
        });
        setEstimate(est);
      } catch {
        setEstimate(null); // agents offline
      } finally {
        setEstimating(false);
      }
    }, 1000);
  }, []);

  function autoResize() {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }

  async function handleSubmit() {
    if (!task.trim()) return;
    setErrorMsg("");
    setResult(null);

    try {
      setSubmitState("estimating");
      const response = await api.submitTask({
        description: task.trim(),
        submitter_address: address ?? "0x0000000000000000000000000000000000000000",
      });
      setSubmitState("opening");
      // brief visual pause so the user sees the state transition
      await new Promise((r) => setTimeout(r, 600));
      setResult(response);
      setSubmitState("done");
      setTimeout(() => setSubmitState("idle"), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(msg);
      setSubmitState("error");
      setTimeout(() => setSubmitState("idle"), 3000);
    }
  }

  const bidDeadlineDate = result
    ? new Date(result.bid_deadline * 1000).toLocaleTimeString()
    : null;
  const reserveEth = result
    ? (Number(BigInt(result.reserve_price_wei)) / 1e18).toFixed(6)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 flex justify-center"
    >
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#F5F5F5]">Submit a Task</h2>
          <p className="text-[#888888] mt-2">
            Describe what you need. MARGINAL will estimate compute and open an auction.
          </p>
        </div>

        <div className="space-y-5">
          {/* Step 1 */}
          <div className="p-5 rounded-xl bg-white/2 border border-white/6">
            <label className="block text-xs text-[#555555] uppercase tracking-wider mb-3">
              Step 1 â€” What do you need done?
            </label>
            <textarea
              ref={textareaRef}
              value={task}
              onChange={(e) => { setTask(e.target.value); autoResize(); triggerEstimate(e.target.value); }}
              placeholder="Summarize this research paper and extract the key findings on compute efficiency..."
              rows={4}
              className="w-full bg-transparent text-sm text-[#F5F5F5] placeholder:text-[#333333] outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/6">
              <span className="text-[11px] font-mono text-[#555555]">{task.length} chars</span>
              <span className="text-[11px] font-mono text-[#555555]">
                ~{estimatedTokens.toLocaleString()} tokens
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-xl bg-white/2 border border-white/6">
            <label className="block text-xs text-[#555555] uppercase tracking-wider mb-3">
              Step 2 â€” Model Preference
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["qwen3.6-plus", "GLM-5-FP8"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    model === m
                      ? "border-[#00C2FF]/40 bg-[#00C2FF]/6"
                      : "border-white/8 bg-white/2 hover:border-white/12"
                  )}
                >
                  <code className={cn(
                    "text-sm font-mono font-semibold block mb-1",
                    model === m ? "text-[#00C2FF]" : "text-[#F5F5F5]"
                  )}>
                    {m}
                  </code>
                  <span className="text-xs text-[#555555]">
                    {m === "qwen3.6-plus"
                      ? "Best for reasoning & research"
                      : "Best for speed & classification"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-xl bg-white/2 border border-white/6">
            <label className="block text-xs text-[#555555] uppercase tracking-wider mb-3">
              Step 3 â€” Maximum Compute Budget
            </label>
            <div className="relative">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full pl-4 pr-20 py-3 rounded-lg bg-white/4 border border-white/8 text-sm font-mono text-[#F5F5F5] outline-none focus:border-[#00C2FF]/40"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-[#555555]">
                tokens
              </span>
            </div>
            <p className="text-xs font-mono text-[#555555] mt-2">
              {estimating ? (
                <span className="text-[#555555] animate-pulse">Estimating cost…</span>
              ) : estimate ? (
                <>
                  On-chain estimate:{" "}
                  <span className="text-[#00C2FF]">{estimate.total_cost_a0gi.toFixed(6)} A0GI</span>
                  <span className="ml-2 text-[#444444]">({estimate.compute_units} units · difficulty {estimate.difficulty})</span>
                </>
              ) : (
                <>
                  Estimated cost at market rate:{" "}
                  <span className="text-[#00C2FF]">{estimatedCost} A0GI</span>
                  <span className="ml-1.5 text-[#444444]">(rough)</span>
                </>
              )}
            </p>
          </div>

          {/* Step 4 â€“ collapsible */}
          <div className="rounded-xl border border-white/6 overflow-hidden">
            <button
              onClick={() => setReserveOpen(!reserveOpen)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm text-[#888888] hover:text-[#F5F5F5] transition-colors"
            >
              <span>
                Step 4 â€” Reserve Price{" "}
                <span className="text-[#555555] text-xs">(optional)</span>
              </span>
              <ChevronDown
                size={16}
                className={cn("transition-transform", reserveOpen && "rotate-180")}
              />
            </button>
            <AnimatePresence>
              {reserveOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-2">
                    <label className="text-xs text-[#555555]">
                      Minimum quality score to accept
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={reserve}
                      onChange={(e) => setReserve(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-white/4 border border-white/8 text-sm font-mono text-[#F5F5F5] outline-none focus:border-[#00C2FF]/40"
                    />
                    <p className="text-xs text-[#555555]">
                      If no agent achieves this score, you get a full refund.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!task || submitState !== "idle"}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold transition-all",
              submitState === "done"
                ? "bg-[#00FF88]/15 border border-[#00FF88]/30 text-[#00FF88]"
                : submitState === "error"
                ? "bg-[#FF4455]/10 border border-[#FF4455]/30 text-[#FF4455]"
                : submitState !== "idle"
                ? "bg-[#00C2FF]/10 border border-[#00C2FF]/20 text-[#00C2FF]"
                : !task
                ? "bg-white/4 border border-white/8 text-[#555555] cursor-not-allowed"
                : "bg-[#00C2FF] text-[#080808] hover:bg-[#00A8E0]"
            )}
          >
            {submitState === "done" ? (
              <Check size={16} />
            ) : submitState !== "idle" && submitState !== "error" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : null}
            {stateMessages[submitState]}
          </button>

          {/* Error message */}
          {submitState === "error" && errorMsg && (
            <p className="text-xs text-[#FF4455] font-mono px-1">{errorMsg}</p>
          )}

          {/* Success result card + live status tracker */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Static submission details */}
                <div className="p-5 rounded-xl bg-[#00FF88]/5 border border-[#00FF88]/20 space-y-3">
                  <p className="text-xs text-[#00FF88] font-semibold uppercase tracking-wider">
                    Auction Opened On-Chain
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono">
                    <span className="text-[#555555]">Task ID</span>
                    <span className="text-[#F5F5F5]">#{result.task_id}</span>
                    <span className="text-[#555555]">Compute Units</span>
                    <span className="text-[#00C2FF]">{result.compute_units.toLocaleString()}</span>
                    <span className="text-[#555555]">Difficulty</span>
                    <span className="text-[#FFB800]">{result.difficulty_score}/100</span>
                    <span className="text-[#555555]">Reserve Price</span>
                    <span className="text-[#F5F5F5]">{reserveEth} A0GI</span>
                    <span className="text-[#555555]">Bid Deadline</span>
                    <span className="text-[#F5F5F5]">{bidDeadlineDate}</span>
                  </div>
                  <a
                    href={`${OG_EXPLORER}/tx/${result.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-[#555555] hover:text-[#00C2FF] transition-colors"
                  >
                    {result.tx_hash.slice(0, 18)}...
                    <ExternalLink size={10} />
                  </a>
                </div>

                {/* Live phase tracker */}
                <div className="p-5 rounded-xl bg-white/2 border border-white/6">
                  <div className="flex items-center gap-2 mb-4">
                    <Radio size={12} className="text-[#00C2FF] animate-pulse" />
                    <span className="text-xs font-semibold text-[#F5F5F5] uppercase tracking-wider">
                      Live Task Status
                    </span>
                  </div>
                  <div className="space-y-3">
                    {TASK_PHASES.map((phase, i) => {
                      const currentState = taskStatus?.state ?? 0;
                      // state 5 = refunded — show only the refund phase
                      const isRefund = currentState === 5;
                      if (isRefund && phase.state !== 5) return null;
                      if (isRefund && phase.state === 5) {
                        return (
                          <div key={phase.state} className="flex items-start gap-3">
                            <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-[#6B7280]/20 border border-[#6B7280]/40 shrink-0">
                              <span className="text-[8px] text-[#6B7280]">R</span>
                            </div>
                            <div>
                              <p className="text-xs font-mono text-[#6B7280]">{phase.label}</p>
                              <p className="text-[11px] text-[#555555]">{phase.desc}</p>
                            </div>
                          </div>
                        );
                      }
                      // Normal phases 0–4
                      if (phase.state === 5) return null;
                      const isDone    = currentState > phase.state;
                      const isActive  = currentState === phase.state;
                      return (
                        <div key={phase.state} className="flex items-start gap-3">
                          <div className={cn(
                            "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                            isDone   && "bg-[#00FF88]/20 border border-[#00FF88]/40",
                            isActive && "bg-[#00C2FF]/20 border border-[#00C2FF]/40",
                            !isDone && !isActive && "border border-white/10 bg-white/2",
                          )}>
                            {isDone ? (
                              <Check size={10} className="text-[#00FF88]" />
                            ) : isActive ? (
                              <Loader2 size={10} className="text-[#00C2FF] animate-spin" />
                            ) : (
                              <span className="text-[8px] font-mono text-[#333333]">{i + 1}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={cn(
                              "text-xs font-mono",
                              isDone   && "text-[#00FF88]",
                              isActive && "text-[#00C2FF]",
                              !isDone && !isActive && "text-[#333333]",
                            )}>
                              {phase.label}
                            </p>
                            {isActive && (
                              <p className="text-[11px] text-[#555555] mt-0.5">{phase.desc}</p>
                            )}
                            {/* Live bid count during bid phase */}
                            {phase.state === 0 && isActive && (taskStatus?.bidCount ?? 0) > 0 && (
                              <p className="text-[11px] font-mono text-[#00C2FF] mt-0.5">
                                {taskStatus!.bidCount} executor{taskStatus!.bidCount === 1 ? "" : "s"} bid
                              </p>
                            )}
                            {/* Bid count once bid phase done */}
                            {phase.state === 0 && isDone && (
                              <p className="text-[11px] font-mono text-[#555555] mt-0.5">
                                {taskStatus?.bidCount ?? "?"} bids received
                              </p>
                            )}
                            {isDone && phase.state === 2 && taskStatus?.winner && (
                              <p className="text-[11px] font-mono text-[#555555] mt-0.5">
                                Winner: {taskStatus.winner.slice(0, 6)}...{taskStatus.winner.slice(-4)}
                                {taskStatus.winningBid ? ` · ${taskStatus.winningBid.toFixed(4)} A0GI` : ""}
                              </p>
                            )}
                            {isDone && phase.state === 3 && taskStatus?.computeUsed && (
                              <p className="text-[11px] font-mono text-[#555555] mt-0.5">
                                Compute used: {taskStatus.computeUsed.toLocaleString()} tokens
                              </p>
                            )}
                            {isDone && phase.state === 4 && taskStatus?.storagePointer && (
                              <p className="text-[11px] font-mono text-[#555555] mt-0.5 truncate">
                                Storage: {taskStatus.storagePointer}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!taskStatus && (
                    <p className="text-[11px] text-[#555555] mt-3 font-mono">
                      Polling chain every 5 s…
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent tasks */}
        <div className="mt-10">
          <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4">Your Recent Tasks</h3>
          <div className="rounded-xl border border-white/6 overflow-hidden">
            {recentTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-4 px-4 py-3.5 border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors"
              >
                <span className="font-mono text-sm text-[#F5F5F5]">#{t.id}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono uppercase",
                  t.status === "live"    && "bg-[#00C2FF]/10 text-[#00C2FF]",
                  t.status === "scored"  && "bg-[#00FF88]/10 text-[#00FF88]",
                  t.status === "slashed" && "bg-[#FF4455]/10 text-[#FF4455]",
                )}>
                  {t.status}
                </span>
                <span className="font-mono text-xs text-[#555555] flex-1">{t.agent}</span>
                <span className={cn(
                  "font-mono text-xs",
                  t.score >= 0.8 ? "text-[#00FF88]" : t.score >= 0.5 ? "text-[#FFB800]" : "text-[#FF4455]"
                )}>
                  {t.score.toFixed(2)}
                </span>
                <span className="font-mono text-xs text-[#888888]">{t.cost} A0GI</span>
                <span className="font-mono text-xs text-[#555555]">{t.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
