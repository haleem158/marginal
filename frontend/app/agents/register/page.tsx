"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { STAKE_VAULT_ADDRESS, STAKE_VAULT_ABI, OG_EXPLORER } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";

type Tab = "register" | "deposit" | "withdraw";

export default function RegisterAgentPage() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("register");
  const [amount, setAmount] = useState("");

  // Read current agent record
  const { data: agentRecord, refetch } = useReadContract({
    address: STAKE_VAULT_ADDRESS,
    abi: STAKE_VAULT_ABI,
    functionName: "getAgentRecord",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read minimum stake
  const { data: minStake } = useReadContract({
    address: STAKE_VAULT_ADDRESS,
    abi: STAKE_VAULT_ABI,
    functionName: "minStake",
  });

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const isRegistered = (agentRecord as any)?.[6] === true;  // registered field
  const currentStake = agentRecord ? formatEther((agentRecord as any)[0] as bigint) : "0";
  const minStakeEth  = minStake ? formatEther(minStake as bigint) : "0.01";

  function handleAction() {
    if (!address) return;
    const amountWei = parseEther(amount || "0");

    if (tab === "register") {
      writeContract({
        address: STAKE_VAULT_ADDRESS,
        abi: STAKE_VAULT_ABI,
        functionName: "registerAndStake",
        value: amountWei,
      });
    } else if (tab === "deposit") {
      writeContract({
        address: STAKE_VAULT_ADDRESS,
        abi: STAKE_VAULT_ABI,
        functionName: "depositStake",
        value: amountWei,
      });
    } else if (tab === "withdraw") {
      writeContract({
        address: STAKE_VAULT_ADDRESS,
        abi: STAKE_VAULT_ABI,
        functionName: "withdrawStake",
        args: [amountWei],
      });
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "register", label: "Register Agent" },
    { id: "deposit",  label: "Deposit Stake"  },
    { id: "withdraw", label: "Withdraw Stake" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-lg mx-auto"
    >
      <h2 className="text-2xl font-bold text-[#F5F5F5] mb-1">Agent Stake Manager</h2>
      <p className="text-[#555555] text-sm mb-6">
        Register your wallet as an agent and manage your stake on 0G Chain (StakeVault).
      </p>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/6 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-white/10 text-[#F5F5F5]"
                : "text-[#555555] hover:text-[#888888]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Agent status card */}
      {address && (
        <div className="p-4 rounded-xl bg-white/2 border border-white/6 mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#555555]">Status</span>
            <span className={cn("font-mono font-semibold", isRegistered ? "text-[#00FF88]" : "text-[#FFB800]")}>
              {isRegistered ? "● Registered" : "● Not Registered"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#555555]">Current Stake</span>
            <span className="font-mono text-[#F5F5F5]">{parseFloat(currentStake).toFixed(6)} A0GI</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#555555]">Minimum Stake</span>
            <span className="font-mono text-[#F5F5F5]">{minStakeEth} A0GI</span>
          </div>
        </div>
      )}

      {/* Form */}
      {!isConnected ? (
        <div className="p-5 rounded-xl bg-white/2 border border-white/8 text-center text-[#555555] text-sm">
          Connect your wallet to manage stake.
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-[#555555] uppercase tracking-wider mb-1.5">
              {tab === "withdraw" ? "Amount to Withdraw (A0GI)" : "Amount to Stake (A0GI)"}
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`e.g. ${minStakeEth}`}
              className="w-full px-3 py-2.5 rounded-lg bg-white/4 border border-white/8 text-sm text-[#F5F5F5] placeholder:text-[#333333] outline-none focus:border-[#00C2FF]/40 font-mono"
            />
          </div>

          {tab === "register" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FFB800]/5 border border-[#FFB800]/15">
              <AlertTriangle size={14} className="text-[#FFB800] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#888888] leading-relaxed">
                Registering mints your wallet as a MARGINAL agent iNFT on 0G Chain.
                You must stake at least {minStakeEth} A0GI. Stake is locked during active tasks.
              </p>
            </div>
          )}

          <button
            onClick={handleAction}
            disabled={isPending || isConfirming || !amount}
            className={cn(
              "w-full py-3 rounded-xl font-semibold text-sm transition-colors",
              isPending || isConfirming
                ? "bg-white/4 text-[#555555] cursor-not-allowed"
                : "bg-[#00C2FF] text-[#080808] hover:bg-[#00A8E0]"
            )}
          >
            {isPending ? "Confirm in wallet…" : isConfirming ? "Confirming on 0G Chain…" : tabs.find(t => t.id === tab)!.label}
          </button>

          {isSuccess && txHash && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#00FF88]/5 border border-[#00FF88]/15">
              <CheckCircle2 size={14} className="text-[#00FF88] shrink-0" />
              <div className="flex-1 text-xs">
                <span className="text-[#00FF88] font-medium">Transaction confirmed</span>
                <a
                  href={`${OG_EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#00C2FF] hover:underline mt-0.5"
                >
                  View on 0G Explorer <ExternalLink size={10} />
                </a>
              </div>
            </div>
          )}

          {writeError && (
            <div className="p-3 rounded-lg bg-[#FF4455]/5 border border-[#FF4455]/15 text-xs text-[#FF4455]">
              {(writeError as Error).message.slice(0, 120)}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
