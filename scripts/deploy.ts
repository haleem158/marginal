import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MARGINAL contracts with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "A0GI\n");

  // ── 1. Deploy StakeVault ─────────────────────────────────────────────────
  const minStake = ethers.parseEther("0.01"); // 0.01 A0GI minimum stake
  const StakeVault = await ethers.getContractFactory("StakeVault");
  const stakeVault = await StakeVault.deploy(minStake);
  await stakeVault.waitForDeployment();
  const stakeVaultAddress = await stakeVault.getAddress();
  console.log("✅ StakeVault deployed:", stakeVaultAddress);

  // ── 2. Deploy AuctionHouse ───────────────────────────────────────────────
  const AuctionHouse = await ethers.getContractFactory("AuctionHouse");
  const auctionHouse = await AuctionHouse.deploy(stakeVaultAddress);
  await auctionHouse.waitForDeployment();
  const auctionHouseAddress = await auctionHouse.getAddress();
  console.log("✅ AuctionHouse deployed:", auctionHouseAddress);

  // ── 3. Deploy MarginalNFT ────────────────────────────────────────────────
  const MarginalNFT = await ethers.getContractFactory("MarginalNFT");
  const marginalNFT = await MarginalNFT.deploy(stakeVaultAddress);
  await marginalNFT.waitForDeployment();
  const marginalNFTAddress = await marginalNFT.getAddress();
  console.log("✅ MarginalNFT deployed:", marginalNFTAddress);

  // ── 4. Wire contracts ────────────────────────────────────────────────────
  console.log("\nWiring contracts...");

  const txSetAH = await stakeVault.setAuctionHouse(auctionHouseAddress);
  await txSetAH.wait();
  console.log("  StakeVault → AuctionHouse set");

  // ── 5. Fund bootstrap subsidy ────────────────────────────────────────────
  const subsidyAmount = ethers.parseEther("0.5"); // 0.5 A0GI bootstrap fund
  const txFund = await stakeVault.fundBootstrapSubsidy({ value: subsidyAmount });
  await txFund.wait();
  console.log(`  Bootstrap subsidy funded: ${ethers.formatEther(subsidyAmount)} A0GI`);

  // ── 6. Save deployment addresses ─────────────────────────────────────────
  const deploymentInfo = {
    network:         (await ethers.provider.getNetwork()).name,
    chainId:         Number((await ethers.provider.getNetwork()).chainId),
    deployer:        deployer.address,
    timestamp:       new Date().toISOString(),
    contracts: {
      StakeVault:   stakeVaultAddress,
      AuctionHouse: auctionHouseAddress,
      MarginalNFT:  marginalNFTAddress,
    },
  };

  const deployPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(deployPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📄 Deployment saved to deployments.json");

  // ── 7. Print env vars for copy-paste ─────────────────────────────────────
  console.log("\n─── Add to .env ─────────────────────────────────────────────");
  console.log(`AUCTION_HOUSE_ADDRESS=${auctionHouseAddress}`);
  console.log(`STAKE_VAULT_ADDRESS=${stakeVaultAddress}`);
  console.log(`MARGINAL_NFT_ADDRESS=${marginalNFTAddress}`);
  console.log("\n─── Add to frontend/.env.local ──────────────────────────────");
  console.log(`NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS=${auctionHouseAddress}`);
  console.log(`NEXT_PUBLIC_STAKE_VAULT_ADDRESS=${stakeVaultAddress}`);
  console.log(`NEXT_PUBLIC_MARGINAL_NFT_ADDRESS=${marginalNFTAddress}`);

  console.log("\n🚀 MARGINAL deployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
