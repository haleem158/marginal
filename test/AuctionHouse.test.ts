import { ethers } from "hardhat";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("AuctionHouse", function () {
  async function deployFixture() {
    const [owner, submitter, executor1, executor2] = await ethers.getSigners();

    const minStake = ethers.parseEther("0.01");
    const StakeVault = await ethers.getContractFactory("StakeVault");
    const stakeVault = await StakeVault.deploy(minStake);
    await stakeVault.waitForDeployment();

    const AuctionHouse = await ethers.getContractFactory("AuctionHouse");
    const auctionHouse = await AuctionHouse.deploy(await stakeVault.getAddress());
    await auctionHouse.waitForDeployment();

    await stakeVault.setAuctionHouse(await auctionHouse.getAddress());

    // Fund bootstrap subsidy
    await stakeVault.fundBootstrapSubsidy({ value: ethers.parseEther("1") });

    // Register executors
    const stakeAmount = ethers.parseEther("0.1");
    await stakeVault.connect(executor1).registerAndStake({ value: stakeAmount });
    await stakeVault.connect(executor2).registerAndStake({ value: stakeAmount });

    return { auctionHouse, stakeVault, owner, submitter, executor1, executor2 };
  }

  describe("Task submission", () => {
    it("submits a task and calculates correct fees", async () => {
      const { auctionHouse, submitter } = await deployFixture();
      const reservePricePerUnit = await auctionHouse.reservePricePerUnit();
      const computeUnits = 500n;
      const reservePrice = computeUnits * reservePricePerUnit;
      const taskFee = (reservePrice * 100n) / 10_000n;
      const total = reservePrice + taskFee;

      await expect(
        auctionHouse.connect(submitter).submitTask("Test task", computeUnits, 50, { value: total })
      ).to.emit(auctionHouse, "TaskSubmitted").withArgs(1, submitter.address, 50, reservePrice, anyValue);

      expect(await auctionHouse.taskCount()).to.equal(1);
    });

    it("reverts if fee is insufficient", async () => {
      const { auctionHouse, submitter } = await deployFixture();
      await expect(
        auctionHouse.connect(submitter).submitTask("Test task", 500, 50, { value: 100 })
      ).to.be.revertedWithCustomError(auctionHouse, "InsufficientTaskFee");
    });

    it("rejects invalid difficulty scores", async () => {
      const { auctionHouse, submitter } = await deployFixture();
      const reservePricePerUnit = await auctionHouse.reservePricePerUnit();
      const total = 500n * reservePricePerUnit + (500n * reservePricePerUnit * 100n) / 10_000n;

      await expect(
        auctionHouse.connect(submitter).submitTask("Test", 500, 101, { value: total })
      ).to.be.revertedWith("AH: difficulty out of range");
    });
  });

  describe("Sealed-bid auction (Vickrey)", () => {
    async function submitAndBid() {
      const fixture = await deployFixture();
      const { auctionHouse, stakeVault, submitter, executor1, executor2 } = fixture;

      const reservePricePerUnit = await auctionHouse.reservePricePerUnit();
      const computeUnits = 500n;
      const reservePrice = computeUnits * reservePricePerUnit;
      const taskFee = (reservePrice * 100n) / 10_000n;
      await auctionHouse.connect(submitter).submitTask("Test task", computeUnits, 50, {
        value: reservePrice + taskFee,
      });

      // executor1 bids higher
      const bid1 = reservePrice * 13n / 10n; // 1.3x reserve
      const salt1 = ethers.randomBytes(32);
      const commitment1 = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes32"], [bid1, salt1])
      );

      // executor2 bids at reserve
      const bid2 = reservePrice;
      const salt2 = ethers.randomBytes(32);
      const commitment2 = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes32"], [bid2, salt2])
      );

      await auctionHouse.connect(executor1).placeBid(1, commitment1, { value: bid1 });
      await auctionHouse.connect(executor2).placeBid(1, commitment2, { value: bid2 });

      return { ...fixture, bid1, bid2, salt1, salt2, reservePrice };
    }

    it("winner pays second price (Vickrey)", async () => {
      const { auctionHouse, executor1, executor2, bid1, bid2, salt1, salt2, reservePrice } =
        await submitAndBid();

      // Advance past bid deadline
      const BID_WINDOW = await auctionHouse.BID_WINDOW();
      await time.increase(Number(BID_WINDOW) + 1);

      await auctionHouse.startRevealPhase(1);
      await auctionHouse.connect(executor1).revealBid(1, bid1, salt1);
      await auctionHouse.connect(executor2).revealBid(1, bid2, salt2);

      const REVEAL_WINDOW = await auctionHouse.REVEAL_WINDOW();
      await time.increase(Number(REVEAL_WINDOW) + 1);

      await expect(auctionHouse.clearAuction(1))
        .to.emit(auctionHouse, "AuctionCleared")
        .withArgs(1, executor1.address, anyValue, 2);

      const task = await auctionHouse.getTask(1);
      expect(task.winner).to.equal(executor1.address);
      // Winner pays second price = bid2 (reserve price)
      expect(task.winningBid).to.equal(bid2);
    });

    it("refunds losing bidder", async () => {
      const { auctionHouse, executor1, executor2, bid1, bid2, salt1, salt2 } =
        await submitAndBid();

      const BID_WINDOW = await auctionHouse.BID_WINDOW();
      await time.increase(Number(BID_WINDOW) + 1);
      await auctionHouse.startRevealPhase(1);
      await auctionHouse.connect(executor1).revealBid(1, bid1, salt1);
      await auctionHouse.connect(executor2).revealBid(1, bid2, salt2);

      const REVEAL_WINDOW = await auctionHouse.REVEAL_WINDOW();
      await time.increase(Number(REVEAL_WINDOW) + 1);

      const executor2BalBefore = await ethers.provider.getBalance(executor2.address);
      await auctionHouse.clearAuction(1);
      const executor2BalAfter = await ethers.provider.getBalance(executor2.address);

      // executor2 gets their collateral back (minus gas)
      expect(executor2BalAfter - executor2BalBefore).to.be.closeTo(bid2, ethers.parseEther("0.001"));
    });
  });

  describe("Task execution & settlement", () => {
    it("executor submits result on-chain", async () => {
      const { auctionHouse, stakeVault, owner, submitter, executor1, executor2 } =
        await deployFixture();

      const reservePricePerUnit = await auctionHouse.reservePricePerUnit();
      const computeUnits = 500n;
      const reservePrice = computeUnits * reservePricePerUnit;
      const total = reservePrice + (reservePrice * 100n) / 10_000n;

      await auctionHouse.connect(submitter).submitTask("Test", computeUnits, 50, { value: total });

      const bid = reservePrice;
      const salt = ethers.randomBytes(32);
      const commitment = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes32"], [bid, salt])
      );
      await auctionHouse.connect(executor1).placeBid(1, commitment, { value: bid });

      await time.increase(Number(await auctionHouse.BID_WINDOW()) + 1);
      await auctionHouse.startRevealPhase(1);
      await auctionHouse.connect(executor1).revealBid(1, bid, salt);
      await time.increase(Number(await auctionHouse.REVEAL_WINDOW()) + 1);
      await auctionHouse.clearAuction(1);

      const outputHash = ethers.keccak256(ethers.toUtf8Bytes("test output"));
      await expect(
        auctionHouse.connect(executor1).submitResult(1, "0g://test-pointer", outputHash, 480)
      ).to.emit(auctionHouse, "TaskCompleted").withArgs(1, executor1.address, "0g://test-pointer", 480);

      // Settle with score 85
      await expect(auctionHouse.connect(owner).settleWithScore(1, 85))
        .to.emit(auctionHouse, "TaskSettled").withArgs(1, 85);
    });
  });
});

function anyValue() { return true; }
