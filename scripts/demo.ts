/**
 * demo.ts — One-command local demo environment setup.
 *
 * Deploys AuctionHouseDemo + StakeVault + MarginalNFT to a local Hardhat node
 * with compressed time windows (30s bid / 20s reveal / 90s execute).
 *
 * Then wires contracts, registers the first signer as an executor, and submits
 * a seed task so the full pipeline starts immediately on agent launch.
 *
 * Usage:
 *   Terminal 1: npx hardhat node
 *   Terminal 2: npx hardhat run scripts/demo.ts --network localhost
 *   Terminal 3: DEMO=1 python agents/run_all.py
 *   Terminal 4: python agents/watch_task.py 1
 *
 * The full cycle completes in ~2.5 minutes.
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const DEMO_DEPLOYMENTS_PATH = path.join(__dirname, "../demo-deployments.json");

async function main() {
  const signers = await ethers.getSigners();
  const deployer  = signers[0];
  const executor  = signers[1] ?? signers[0];
  const submitter = signers[2] ?? signers[0];

  const network = await ethers.provider.getNetwork();
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║         MARGINAL — Local Demo Setup                 ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`  Network  : ${network.name} (chain ${network.chainId})`);
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Executor : ${executor.address}`);
  console.log(`  Submitter: ${submitter.address}\n`);

  // ── 1. Deploy StakeVault ─────────────────────────────────────────────────
  const minStake = ethers.parseEther("0.001"); // tiny minimum for local testing
  const StakeVault = await ethers.getContractFactory("StakeVault");
  const stakeVault = await StakeVault.connect(deployer).deploy(minStake);
  await stakeVault.waitForDeployment();
  const stakeVaultAddr = await stakeVault.getAddress();
  console.log("✅ StakeVault deployed    :", stakeVaultAddr);

  // ── 2. Deploy AuctionHouseDemo (30s/20s/90s windows) ────────────────────
  const AuctionHouseDemo = await ethers.getContractFactory("AuctionHouseDemo");
  const auctionHouse = await AuctionHouseDemo.connect(deployer).deploy(stakeVaultAddr);
  await auctionHouse.waitForDeployment();
  const auctionHouseAddr = await auctionHouse.getAddress();
  console.log("✅ AuctionHouseDemo deployed:", auctionHouseAddr);
  console.log("   ⏱  Bid: 30s  |  Reveal: 20s  |  Execute: 90s");

  // ── 3. Deploy MarginalNFT ────────────────────────────────────────────────
  const MarginalNFT = await ethers.getContractFactory("MarginalNFT");
  const marginalNFT = await MarginalNFT.connect(deployer).deploy(stakeVaultAddr);
  await marginalNFT.waitForDeployment();
  const marginalNFTAddr = await marginalNFT.getAddress();
  console.log("✅ MarginalNFT deployed   :", marginalNFTAddr);

  // ── 4. Wire StakeVault → AuctionHouse ───────────────────────────────────
  await (await stakeVault.connect(deployer).setAuctionHouse(auctionHouseAddr)).wait();
  console.log("✅ StakeVault wired to AuctionHouse");

  // ── 5. Fund bootstrap subsidy ────────────────────────────────────────────
  const subsidy = ethers.parseEther("1.0");
  await (await stakeVault.connect(deployer).fundBootstrapSubsidy({ value: subsidy })).wait();
  console.log(`✅ Bootstrap subsidy funded: 1.0 ETH`);

  // ── 6. Register executor as staked agent ─────────────────────────────────
  const stakeAmount = minStake * 10n;
  await (await stakeVault.connect(executor).registerAndStake({ value: stakeAmount })).wait();
  console.log(`✅ Executor registered with ${ethers.formatEther(stakeAmount)} ETH stake`);

  // ── 7. Submit seed task ──────────────────────────────────────────────────
  // reservePricePerUnit default = 1_000 gwei, computeUnits = 50 → reserve = 50_000 gwei
  const computeUnits = 50n;
  const reservePricePerUnit = await auctionHouse.reservePricePerUnit();
  const reserve  = computeUnits * reservePricePerUnit;
  const taskFee  = (reserve * 100n) / 10_000n;     // 1% fee (TASK_FEE_BPS = 100)
  const totalDue = reserve + taskFee;

  const description = "Explain why decentralized compute markets improve AI inference resilience compared to centralized cloud providers.";

  const tx = await auctionHouse.connect(submitter).submitTask(
    description,
    computeUnits,
    72, // difficulty score 1-100
    { value: totalDue }
  );
  const receipt = await tx.wait();
  const taskId = await auctionHouse.taskCount();

  console.log(`\n🚀 Seed task submitted!`);
  console.log(`   Task ID     : #${taskId}`);
  console.log(`   Description : "${description.slice(0, 60)}..."`);
  console.log(`   Compute     : ${computeUnits} units`);
  console.log(`   Reserve     : ${ethers.formatEther(reserve)} ETH`);
  console.log(`   Difficulty  : 72/100`);
  console.log(`   Tx hash     : ${receipt?.hash}`);

  // ── 8. Save demo deployment addresses ───────────────────────────────────
  const demoInfo = {
    network:      "localhost",
    chainId:      Number(network.chainId),
    deployer:     deployer.address,
    executor:     executor.address,
    timestamp:    new Date().toISOString(),
    windows:      { bid_seconds: 30, reveal_seconds: 20, execute_seconds: 90 },
    contracts: {
      StakeVault:        stakeVaultAddr,
      AuctionHouseDemo:  auctionHouseAddr,
      MarginalNFT:       marginalNFTAddr,
    },
    seed_task: {
      id:          Number(taskId),
      description: description,
      tx_hash:     receipt?.hash,
    },
  };

  fs.writeFileSync(DEMO_DEPLOYMENTS_PATH, JSON.stringify(demoInfo, null, 2));
  console.log(`\n📄 Demo addresses saved to demo-deployments.json`);

  // ── 9. Print agent env block ──────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  Add these to your .env.demo (or override .env):    ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`  OG_RPC_URL=${(await ethers.provider.getNetwork()).name === "unknown" ? "http://127.0.0.1:8545" : "http://127.0.0.1:8545"}`);
  console.log(`  AUCTION_HOUSE_ADDRESS=${auctionHouseAddr}`);
  console.log(`  STAKE_VAULT_ADDRESS=${stakeVaultAddr}`);
  console.log(`  MARGINAL_NFT_ADDRESS=${marginalNFTAddr}`);
  console.log(`  DEMO_MODE=1`);
  console.log("\n  Then run: DEMO=1 python agents/run_all.py");
  console.log("  And    : python agents/watch_task.py 1\n");
}

main().catch((err) => {
  console.error("❌ Demo setup failed:", err);
  process.exit(1);
});
