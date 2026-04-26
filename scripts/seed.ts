/**
 * seed.ts — Populate a fresh deployment with demo tasks and agents for a live demo.
 * Run: npx hardhat run scripts/seed.ts --network og-testnet
 */
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const DEPLOYMENTS_PATH = path.join(__dirname, "../deployments.json");

async function main() {
  if (!fs.existsSync(DEPLOYMENTS_PATH)) {
    throw new Error("deployments.json not found — run deploy.ts first");
  }

  const deployments = JSON.parse(fs.readFileSync(DEPLOYMENTS_PATH, "utf8"));
  const [deployer, executor1, executor2] = await ethers.getSigners();

  const auctionHouse = await ethers.getContractAt(
    "AuctionHouse",
    deployments.contracts.AuctionHouse
  );
  const stakeVault = await ethers.getContractAt(
    "StakeVault",
    deployments.contracts.StakeVault
  );

  console.log("Seeding MARGINAL demo...\n");

  // ── Register executor agents ─────────────────────────────────────────────
  const minStake = await stakeVault.minStakeAmount();
  const stakeAmount = minStake * 10n; // stake 10× minimum

  if (executor1) {
    const tx = await stakeVault.connect(executor1).registerAndStake({ value: stakeAmount });
    await tx.wait();
    console.log("✅ Executor #1 registered:", executor1.address);
  }

  if (executor2) {
    const tx = await stakeVault.connect(executor2).registerAndStake({ value: stakeAmount });
    await tx.wait();
    console.log("✅ Executor #2 registered:", executor2.address);
  }

  // ── Submit demo tasks ────────────────────────────────────────────────────
  const tasks = [
    {
      description: "Summarize the economic implications of Vickrey auctions for decentralized compute markets in 200 words.",
      computeUnits: 500n,
      difficulty: 65,
    },
    {
      description: "Write a Python function that implements an exponentially weighted moving average with configurable alpha.",
      computeUnits: 800n,
      difficulty: 72,
    },
    {
      description: "Explain Proof of Efficient Compute (PoEC) as if presenting to a panel of DeFi investors.",
      computeUnits: 600n,
      difficulty: 80,
    },
  ];

  const reservePricePerUnit = await auctionHouse.reservePricePerUnit();

  for (const task of tasks) {
    const reservePrice = task.computeUnits * reservePricePerUnit;
    const taskFee = (reservePrice * 100n) / 10_000n; // 1% fee
    const total = reservePrice + taskFee;

    const tx = await auctionHouse.submitTask(
      task.description,
      task.computeUnits,
      task.difficulty,
      { value: total }
    );
    const receipt = await tx.wait();
    const event = receipt?.logs.find(
      (log: any) => log.fragment?.name === "TaskSubmitted"
    ) as any;
    const taskId = event?.args?.[0];
    console.log(`✅ Task #${taskId} submitted: "${task.description.substring(0, 50)}..."`);
  }

  console.log("\n🌱 Seed complete — demo tasks and agents ready.");
  console.log("Now run the Python agents to start the auction loop.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
