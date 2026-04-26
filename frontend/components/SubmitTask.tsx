"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";

const AUCTIONEER_API = process.env.NEXT_PUBLIC_AUCTIONEER_URL || "http://localhost:8000";

export function SubmitTask({ onSubmitted }: { onSubmitted: () => void }) {
  const { isConnected } = useAccount();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    task_id: number;
    compute_units: number;
    difficulty_score: number;
    reserve_price_wei: string;
    tx_hash: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${AUCTIONEER_API}/tasks/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          submitter_address: "0x0000000000000000000000000000000000000000", // placeholder for API
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Submission failed");
      }

      const data = await response.json();
      setResult(data);
      setDescription("");
      onSubmitted();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
        Submit Task
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the AI inference task (e.g. 'Summarize the economic implications of PoEC for DeFi…')"
          rows={3}
          maxLength={4096}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 
                     placeholder-gray-500 resize-none focus:outline-none focus:border-green-500 transition-colors"
          disabled={loading}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {description.length}/4096 chars · Task fee is auto-calculated by Auctioneer
          </p>
          <button
            type="submit"
            disabled={!description.trim() || loading}
            className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 
                       text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? "Submitting…" : "Submit Task →"}
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-4 bg-green-950/50 border border-green-800 rounded-lg p-3 text-xs">
          <p className="text-green-400 font-semibold mb-1.5">✓ Task #{result.task_id} submitted</p>
          <div className="grid grid-cols-3 gap-2 text-gray-400">
            <div>
              <span className="text-gray-500 block">Compute Units</span>
              <span className="text-gray-200">{result.compute_units}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Difficulty</span>
              <span className="text-gray-200">{result.difficulty_score}/100</span>
            </div>
            <div>
              <span className="text-gray-500 block">Reserve Price</span>
              <span className="text-gray-200">
                {parseFloat((Number(result.reserve_price_wei) / 1e18).toFixed(6))} A0GI
              </span>
            </div>
          </div>
          <p className="mt-2 text-gray-500 font-mono truncate">tx: {result.tx_hash}</p>
        </div>
      )}

      {error && (
        <div className="mt-3 bg-red-950/50 border border-red-800 rounded-lg p-3 text-xs text-red-400">
          {error}
        </div>
      )}
    </section>
  );
}
