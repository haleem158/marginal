import { ethers } from "hardhat";
import { expect } from "chai";

describe("StakeVault", () => {
  async function deploy() {
    const [owner, agent1, agent2, ah] = await ethers.getSigners();
    const minStake = ethers.parseEther("0.01");
    const StakeVault = await ethers.getContractFactory("StakeVault");
    const vault = await StakeVault.deploy(minStake);
    await vault.waitForDeployment();
    await vault.setAuctionHouse(ah.address);
    return { vault, owner, agent1, agent2, ah, minStake };
  }

  it("registers agent with stake", async () => {
    const { vault, agent1, minStake } = await deploy();
    await vault.connect(agent1).registerAndStake({ value: minStake * 5n });
    const record = await vault.getAgentRecord(agent1.address);
    expect(record.registered).to.be.true;
    expect(record.totalStake).to.equal(minStake * 5n);
    expect(record.efficiencyScore).to.equal(7_000); // starts at 70.00
  });

  it("rejects duplicate registration", async () => {
    const { vault, agent1, minStake } = await deploy();
    await vault.connect(agent1).registerAndStake({ value: minStake });
    await expect(
      vault.connect(agent1).registerAndStake({ value: minStake })
    ).to.be.revertedWithCustomError(vault, "AlreadyRegistered");
  });

  it("distributes reward for efficient work (score ≥ 60)", async () => {
    const { vault, agent1, ah, minStake } = await deploy();
    const stakeAmount = minStake * 10n;
    await vault.connect(agent1).registerAndStake({ value: stakeAmount });
    await vault.fundBootstrapSubsidy({ value: ethers.parseEther("1") });

    const bidAmount = ethers.parseEther("0.1");
    const score = 90; // high efficiency

    const balBefore = await ethers.provider.getBalance(agent1.address);
    await vault.connect(ah).processTaskSettlement(1, agent1.address, bidAmount, score, 400);
    const balAfter = await ethers.provider.getBalance(agent1.address);

    // Agent should receive more than bid amount (reward > bid)
    expect(balAfter - balBefore).to.be.gt(bidAmount);
  });

  it("slashes agent for inefficient work (score < 60)", async () => {
    const { vault, agent1, ah, minStake } = await deploy();
    await vault.connect(agent1).registerAndStake({ value: minStake * 20n });
    await vault.fundBootstrapSubsidy({ value: ethers.parseEther("1") });

    const bidAmount = ethers.parseEther("0.1");
    const stakeBeforeRecord = await vault.getAgentRecord(agent1.address);
    const stakeBefore = stakeBeforeRecord.totalStake;

    await vault.connect(ah).processTaskSettlement(1, agent1.address, bidAmount, 20, 1000);

    const stakeAfterRecord = await vault.getAgentRecord(agent1.address);
    expect(stakeAfterRecord.totalStake).to.be.lt(stakeBefore);
    expect(stakeAfterRecord.lifetimeSlashed).to.be.gt(0n);
  });

  it("applies soft slash floor in epoch 0 (max 10%)", async () => {
    const { vault, agent1, ah, minStake } = await deploy();
    await vault.connect(agent1).registerAndStake({ value: minStake * 20n });

    const bidAmount = ethers.parseEther("0.1");
    const maxSlash10pct = (bidAmount * 10n) / 100n;

    await vault.connect(ah).processTaskSettlement(1, agent1.address, bidAmount, 5, 1000);

    const record = await vault.getAgentRecord(agent1.address);
    // Slashed amount should not exceed 10% of bid in epoch 0
    expect(record.lifetimeSlashed).to.be.lte(maxSlash10pct);
  });
});
