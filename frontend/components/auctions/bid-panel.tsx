"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info, ChevronDown, Check, Loader2, Wallet, ExternalLink } from "lucide-react";
import { useAccount, useWriteContract } from "wagmi";
import { keccak256, encodePacked, parseEther } from "viem";
import { Auction } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { AUCTION_HOUSE_ABI, AUCTION_HOUSE_ADDRESS, OG_EXPLORER } from "@/lib/contracts";

interface BidPanelProps {
  auction: Auction | null;
  onClose: () => void;
}

type SubmitState = "idle" | "signing" | "broadcasting" | "done" | "error";

const stateMessages: Record<SubmitState, string> = {
  idle:         "Submit Sealed Bid",
  signing:      "Sign in wallet...",
  broadcasting: "Broadcasting...",
  done:         "Bid Placed ✓",
  error:        "Transaction Failed",
};

export function BidPanel({ auction, onClose }: BidPanelProps) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [explainerOpen, setExplainerOpen] = useState(false);
  const [bidAmount, setBidAmount]         = useState("");
  const [submitState, setSubmitState]     = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg]           = useState("");
  const [txHash, setTxHash]               = useState<string | null>(null);

  async function handleSubmit() {
    if (!auction || !bidAmount || !isConnected || !address) return;
    setErrorMsg("");
    setTxHash(null);

    try {
      setSubmitState("signing");

      // 1. Generate cryptographically random salt
      const saltBytes = crypto.getRandomValues(new Uint8Array(32));
      const salt = `0x${Array.from(saltBytes).map(b => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;

      // 2. Convert bid to wei
      const amountWei = parseEther(bidAmount);

      // 3. Build Vickrey commitment: keccak256(abi.encodePacked(amount, salt))
      const commitment = keccak256(encodePacked(["uint256", "bytes32"], [amountWei, salt]));

      // 4. Collateral = reservePrice (rewardPool is already in A0GI)
      const collateralWei = parseEther(auction.rewardPool.toFixed(18));

      // 5. Persist salt so the reveal phase can re-derive the commitment
      localStorage.setItem(
        `bid-${auction.id}`,
        JSON.stringify({ amount: amountWei.toString(), salt, address })
      );

      setSubmitState("broadcasting");

      const hash = await writeContractAsync({
        address: AUCTION_HOUSE_ADDRESS,
        abi:     AUCTION_HOUSE_ABI,
        functionName: "placeBid",
        args:    [BigInt(auction.id), commitment],
        value:   collateralWei,
      });

      setTxHash(hash);
      setSubmitState("done");
      setTimeout(() => {
        setSubmitState("idle");
        onClose();
      }, 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 120) : "Unknown error";
      setErrorMsg(msg);
      setSubmitState("error");
      setTimeout(() => setSubmitState("idle"), 4000);
    }
  }

  return (
    <AnimatePresence>
      {auction && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Slide-in panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="fixed right-0 top-0 bottom-0 w-[400px] z-50 bg-[#0F0F0F] border-l border-white/8 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/6">
              <div>
                <h3 className="text-sm font-semibold text-[#F5F5F5]">Place Sealed Bid</h3>
                <p className="text-xs text-[#555555] font-mono mt-0.5">Task #{auction.id}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-[#555555] hover:text-[#F5F5F5] hover:bg-white/4 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Task details */}
              <div>
                <div className="text-xs text-[#555555] uppercase tracking-wider mb-2">Task Details</div>
                <p className="text-sm text-[#888888] leading-relaxed line-clamp-4">{auction.taskDescription}</p>
                <div className="flex gap-3 mt-3">
                  <div className="flex-1 p-3 rounded-lg bg-white/4 border border-white/6">
                    <div className="text-[10px] text-[#555555] mb-1">Compute</div>
                    <span className="font-mono text-xs text-[#F5F5F5]">{auction.computeEst.toLocaleString()}</span>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-white/4 border border-white/6">
                    <div className="text-[10px] text-[#555555] mb-1">Bids</div>
                    <span className="font-mono text-xs text-[#F5F5F5]">{auction.bidCount}</span>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-white/4 border border-white/6">
                    <div className="text-[10px] text-[#555555] mb-1">Reserve</div>
                    <span className="font-mono text-xs text-[#00FF88]">
                      {auction.rewardPool.toFixed(4)} A0GI
                    </span>
                  </div>
                </div>
              </div>

              {/* Vickrey explainer */}
              <div className="rounded-lg bg-[#00C2FF]/5 border border-[#00C2FF]/15">
                <button
                  onClick={() => setExplainerOpen(!explainerOpen)}
                  className="w-full flex items-center justify-between p-3 text-xs text-[#00C2FF]"
                >
                  <div className="flex items-center gap-2">
                    <Info size={13} />
                    <span>About Vickrey Auctions</span>
                  </div>
                  <ChevronDown
                    size={13}
                    className={cn("transition-transform", explainerOpen && "rotate-180")}
                  />
                </button>
                <AnimatePresence>
                  {explainerOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-3 pb-3 text-xs text-[#888888] leading-relaxed">
                        In a Vickrey auction you pay the second-highest bid. Bid your true compute
                        cost — no more, no less. Your collateral ({auction.rewardPool.toFixed(4)} A0GI)
                        is returned minus the second price if you win, or returned in full if you lose.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Wallet status */}
              {!isConnected ? (
                <div className="p-4 rounded-xl bg-[#FFB800]/5 border border-[#FFB800]/20 flex items-center gap-3">
                  <Wallet size={16} className="text-[#FFB800] shrink-0" />
                  <p className="text-xs text-[#FFB800]">
                    Connect your wallet to place a bid. Your agent address must be registered
                    and staked in StakeVault.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-white/4 border border-white/8 text-xs font-mono text-[#555555]">
                  <span className="text-[#888888]">Bidding as: </span>
                  <span className="text-[#F5F5F5]">{address?.slice(0, 8)}...{address?.slice(-6)}</span>
                </div>
              )}

              {/* Bid amount */}
              <div>
                <div className="text-xs text-[#555555] uppercase tracking-wider mb-2">
                  Bid Amount <span className="normal-case">(your true compute cost)</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="0.000000"
                    step="0.000001"
                    className="w-full pl-4 pr-16 py-3 rounded-lg bg-white/4 border border-white/8 text-sm font-mono text-[#F5F5F5] focus:border-[#00C2FF]/40 outline-none placeholder:text-[#333333]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-[#555555]">
                    A0GI
                  </span>
                </div>
                {bidAmount && Number(bidAmount) > 0 && (
                  <p className="text-xs text-[#555555] font-mono mt-1.5">
                    Collateral required:{" "}
                    <span className="text-[#FFB800]">{auction.rewardPool.toFixed(4)} A0GI</span>
                    {" "}(returned if you lose)
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="p-5 border-t border-white/6 space-y-2">
              {submitState === "error" && errorMsg && (
                <p className="text-[10px] text-[#FF4455] font-mono leading-relaxed">{errorMsg}</p>
              )}
              {txHash && (
                <a
                  href={`${OG_EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-mono text-[#00FF88] hover:underline"
                >
                  {txHash.slice(0, 18)}... <ExternalLink size={9} />
                </a>
              )}
              <button
                onClick={handleSubmit}
                disabled={!bidAmount || !isConnected || submitState !== "idle"}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                  submitState === "done"
                    ? "bg-[#00FF88]/15 border border-[#00FF88]/30 text-[#00FF88]"
                    : submitState === "error"
                    ? "bg-[#FF4455]/10 border border-[#FF4455]/30 text-[#FF4455]"
                    : submitState !== "idle"
                    ? "bg-[#00C2FF]/10 border border-[#00C2FF]/20 text-[#00C2FF]"
                    : !bidAmount || !isConnected
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
