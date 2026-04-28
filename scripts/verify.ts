/**
 * verify.ts — on-chain health check for MARGINAL contracts.
 *
 * Reads key state from all three deployed contracts and prints a status
 * table. Exits with code 1 if any contract is unreachable or in an
 * unexpected state.
 *
 * Usage:  npx hardhat run scripts/verify.ts --network og-mainnet
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ── Minimal ABIs (read-only views only) ──────────────────────────────────────

const AUCTION_HOUSE_ABI = [
  "function taskCount() view returns (uint256)",
  "function epochDuration() view returns (uint256)",
  "function currentEpoch() view returns (uint256)",
  "function totalSettled() view returns (uint256)",
  "function getTask(uint256 taskId) view returns (tuple(address submitter, uint256 reservePrice, uint256 computeUnits, uint256 bidDeadline, uint256 revealDeadline, uint256 executeDeadline, address winner, uint256 winnerBid, uint256 secondBid, uint256 eficiencyScore, uint8 state, address executor))",
];

const STAKE_VAULT_ABI = [
  "function minStake() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function bootstrapPool() view returns (uint256)",
  "function agentCount() view returns (uint256)",
  "function auctionHouse() view returns (address)",
];

const MARGINAL_NFT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const OK   = "✅";
const WARN = "⚠️ ";
const FAIL = "❌";

function row(label: string, value: string, status = OK) {
  console.log(`  ${status}  ${label.padEnd(28)} ${value}`);
}

function section(title: string) {
  console.log(`\n${"─".repeat(56)}`);
  console.log(`  ${title}`);
  console.log(`${"─".repeat(56)}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    console.error(`${FAIL}  deployments.json not found — run deploy.ts first.`);
    process.exit(1);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const { StakeVault, AuctionHouse, MarginalNFT } = deployments.contracts as Record<string, string>;

  const [signer] = await ethers.getSigners();
  const network   = await ethers.provider.getNetwork();

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("         MARGINAL — Contract Health Check");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Network :  ${network.name} (chain ${network.chainId})`);
  console.log(`  Checker :  ${signer.address}`);
  console.log(`  Balance :  ${ethers.formatEther(await ethers.provider.getBalance(signer.address))} A0GI`);

  let exitCode = 0;

  // ── StakeVault ────────────────────────────────────────────────────────────
  section("StakeVault  " + StakeVault);
  try {
    const sv = new ethers.Contract(StakeVault, STAKE_VAULT_ABI, ethers.provider);
    const [minStake, totalStaked, bootstrapPool, agentCount, auctionHouseAddr] = await Promise.all([
      sv.minStake()      as Promise<bigint>,
      sv.totalStaked()   as Promise<bigint>,
      sv.bootstrapPool() as Promise<bigint>,
      sv.agentCount()    as Promise<bigint>,
      sv.auctionHouse()  as Promise<string>,
    ]);

    row("minStake",        `${ethers.formatEther(minStake)} A0GI`);
    row("totalStaked",     `${ethers.formatEther(totalStaked)} A0GI`);
    row("bootstrapPool",   `${ethers.formatEther(bootstrapPool)} A0GI`);
    row("agentCount",      agentCount.toString());

    const ahWired = auctionHouseAddr.toLowerCase() === AuctionHouse.toLowerCase();
    row("auctionHouse ptr", auctionHouseAddr, ahWired ? OK : FAIL);
    if (!ahWired) exitCode = 1;
  } catch (err) {
    row("reachable", "FAILED — " + String(err), FAIL);
    exitCode = 1;
  }

  // ── AuctionHouse ──────────────────────────────────────────────────────────
  section("AuctionHouse  " + AuctionHouse);
  try {
    const ah = new ethers.Contract(AuctionHouse, AUCTION_HOUSE_ABI, ethers.provider);
    const [taskCount, epochDuration, currentEpoch, totalSettled] = await Promise.all([
      ah.taskCount()     as Promise<bigint>,
      ah.epochDuration() as Promise<bigint>,
      ah.currentEpoch()  as Promise<bigint>,
      ah.totalSettled()  as Promise<bigint>,
    ]);

    row("taskCount",      taskCount.toString());
    row("currentEpoch",   currentEpoch.toString());
    row("epochDuration",  `${epochDuration.toString()} seconds`);
    row("totalSettled",   totalSettled.toString());

    // Spot-check the most recent task if any exist
    if (taskCount > 0n) {
      try {
        const latestTask = await ah.getTask(taskCount) as { state: number; reservePrice: bigint; computeUnits: bigint };
        const STATE_LABELS: Record<number, string> = {
          0: "Open",
          1: "Revealing",
          2: "Executing",
          3: "Settled",
          4: "Cancelled",
        };
        row(`task #${taskCount} state`,  STATE_LABELS[latestTask.state] ?? "Unknown");
        row(`task #${taskCount} reserve`, `${ethers.formatEther(latestTask.reservePrice)} A0GI`);
      } catch {
        row(`task #${taskCount} (spot)`, "read failed", WARN);
      }
    }
  } catch (err) {
    row("reachable", "FAILED — " + String(err), FAIL);
    exitCode = 1;
  }

  // ── MarginalNFT ───────────────────────────────────────────────────────────
  section("MarginalNFT  " + MarginalNFT);
  try {
    const nft = new ethers.Contract(MarginalNFT, MARGINAL_NFT_ABI, ethers.provider);
    const [name, symbol, totalSupply] = await Promise.all([
      nft.name()        as Promise<string>,
      nft.symbol()      as Promise<string>,
      nft.totalSupply() as Promise<bigint>,
    ]);
    row("name",        name);
    row("symbol",      symbol);
    row("totalSupply", totalSupply.toString() + " NFTs minted");
  } catch (err) {
    row("reachable", "FAILED — " + String(err), FAIL);
    exitCode = 1;
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(56)}`);
  if (exitCode === 0) {
    console.log("  ✅  All contracts healthy — deployment looks good.");
  } else {
    console.log("  ❌  One or more checks failed. Review the output above.");
  }
  console.log(`${"═".repeat(56)}\n`);

  process.exit(exitCode);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
