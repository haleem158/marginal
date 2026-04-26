// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IStakeVault {
    function processTaskSettlement(
        uint256 taskId,
        address executor,
        uint256 bidAmount,
        uint256 efficiencyScore,
        uint256 computeUnitsUsed
    ) external;

    function hasMinimumStake(address agent) external view returns (bool);
}

/**
 * @title AuctionHouse
 * @notice Core auction contract for MARGINAL — Decentralized Compute Allocation Market
 * @dev Implements commit-reveal Vickrey (second-price) sealed-bid auction.
 *      Winners pay the second-highest bid, making honest bidding the dominant strategy.
 *      Two-phase commit prevents orphaned tasks on 0G Storage.
 */
contract AuctionHouse is Ownable, ReentrancyGuard {

    // ─── Types ────────────────────────────────────────────────────────────────

    enum TaskState {
        Open,       // accepting bid commitments
        Revealing,  // accepting bid reveals
        Executing,  // winner executing on 0G Compute
        Completed,  // result submitted, awaiting auditor score
        Settled,    // score submitted, rewards distributed
        Refunded    // no bids / deadline exceeded — fees returned
    }

    struct Task {
        uint256 id;
        address submitter;
        string  description;
        uint256 computeUnitsEstimate;  // estimated GPU compute units
        uint256 difficultyScore;       // 1-100; adjusts efficiency reward curve
        uint256 reservePrice;          // wei; minimum winning bid (floor)
        uint256 taskFee;               // wei; protocol fee paid by submitter
        uint256 bidDeadline;           // commit phase closes
        uint256 revealDeadline;        // reveal phase closes
        uint256 executeDeadline;       // execution grace window closes
        TaskState state;
        address winner;
        uint256 winningBid;            // second-price amount winner pays
        uint256 highestBid;            // actual highest bid (for reference)
        uint256 computeUnitsUsed;      // set by executor on result submission
        string  storagePointer;        // 0G Storage Log pointer to inference result
        bytes32 outputHash;            // keccak256(result) for integrity check
    }

    struct BidCommitment {
        bytes32 commitment;    // keccak256(abi.encodePacked(amount, salt))
        uint256 revealedAmount;
        bool    revealed;
        uint256 collateral;    // locked with commitment; returned if loser
    }

    // ─── State ────────────────────────────────────────────────────────────────

    mapping(uint256 => Task)                              public tasks;
    mapping(uint256 => address[])                         public taskBidders;
    mapping(uint256 => mapping(address => BidCommitment)) public bidCommitments;

    /// @dev Pull-payment refund ledger — losers/refundees claim here instead of push-transfer in loops
    mapping(address => uint256) public pendingRefunds;

    uint256 public taskCount;
    uint256 public totalTasksCompleted;

    /// @dev Protocol fee accumulator — only these funds are withdrawable via withdrawTreasury
    uint256 public protocolFees;

    /// @dev Bid commit window — short to keep demo snappy, raise in production
    uint256 public constant BID_WINDOW            = 5 minutes;
    /// @dev Reveal window after commit closes
    uint256 public constant REVEAL_WINDOW         = 3 minutes;
    /// @dev Grace period for execution (2× the estimated compute time, floored here)
    uint256 public constant DEFAULT_EXECUTE_GRACE = 15 minutes;

    /// @dev Reserve price per compute unit in wei (set by owner; mirrors 0G Compute pricing)
    uint256 public reservePricePerUnit = 1_000 gwei;

    /// @dev Protocol task fee: 1% of reserve price, stays in contract as treasury
    uint256 public constant TASK_FEE_BPS = 100;

    /// @dev Maximum bidders per task — prevents gas-exhaustion DoS in clearAuction loop
    uint256 public constant MAX_BIDDERS = 50;

    /// @dev Maximum on-chain task description length in bytes
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1024;

    IStakeVault public stakeVault;

    // ─── Events ───────────────────────────────────────────────────────────────

    event TaskSubmitted(
        uint256 indexed taskId,
        address indexed submitter,
        uint256 difficultyScore,
        uint256 reservePrice,
        uint256 bidDeadline
    );
    event BidCommitted(uint256 indexed taskId, address indexed bidder, bytes32 commitment);
    event BidRevealed(uint256 indexed taskId, address indexed bidder, uint256 amount);
    event RefundQueued(address indexed recipient, uint256 amount, string reason);
    event AuctionCleared(
        uint256 indexed taskId,
        address indexed winner,
        uint256 secondPrice,
        uint256 bidderCount
    );
    event ExecutionStarted(uint256 indexed taskId, address indexed executor, uint256 executeDeadline);
    event TaskCompleted(
        uint256 indexed taskId,
        address indexed executor,
        string storagePointer,
        uint256 computeUnitsUsed
    );
    event TaskSettled(uint256 indexed taskId, uint256 efficiencyScore);
    event TaskRefunded(uint256 indexed taskId, address indexed submitter, uint256 refundAmount);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error TaskNotFound();
    error InvalidState(TaskState current);
    error BidWindowClosed();
    error RevealWindowClosed();
    error WindowStillOpen();
    error CommitmentMismatch();
    error InsufficientCollateral();
    error NotWinner();
    error ExecutionDeadlinePassed();
    error InsufficientTaskFee();
    error AgentNotStaked();
    error AlreadyRevealed();
    error ScoreOutOfRange();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _stakeVault) Ownable(msg.sender) {
        stakeVault = IStakeVault(_stakeVault);
    }

    // ─── Task Submission ──────────────────────────────────────────────────────

    /**
     * @notice Submit an AI inference task. Submitter pays reservePrice + task fee.
     * @param description  Task prompt / description
     * @param computeUnitsEstimate  Estimated GPU compute units (determines floor price)
     * @param difficultyScore  1-100; affects Auditor's efficiency reward multiplier
     */
    function submitTask(
        string calldata description,
        uint256 computeUnitsEstimate,
        uint256 difficultyScore
    ) external payable nonReentrant {
        require(computeUnitsEstimate > 0, "AH: invalid compute estimate");
        require(difficultyScore >= 1 && difficultyScore <= 100, "AH: difficulty out of range");
        require(bytes(description).length > 0, "AH: empty description");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "AH: description too long");

        uint256 reservePrice = computeUnitsEstimate * reservePricePerUnit;
        uint256 taskFee      = (reservePrice * TASK_FEE_BPS) / 10_000;
        uint256 totalRequired = reservePrice + taskFee;

        if (msg.value < totalRequired) revert InsufficientTaskFee();

        // Accumulate only task fees as withdrawable treasury — rest is locked for task/collateral
        protocolFees += taskFee;

        uint256 taskId = ++taskCount;

        tasks[taskId] = Task({
            id:                   taskId,
            submitter:            msg.sender,
            description:          description,
            computeUnitsEstimate: computeUnitsEstimate,
            difficultyScore:      difficultyScore,
            reservePrice:         reservePrice,
            taskFee:              taskFee,
            bidDeadline:          block.timestamp + BID_WINDOW,
            revealDeadline:       block.timestamp + BID_WINDOW + REVEAL_WINDOW,
            executeDeadline:      block.timestamp + BID_WINDOW + REVEAL_WINDOW + DEFAULT_EXECUTE_GRACE,
            state:                TaskState.Open,
            winner:               address(0),
            winningBid:           0,
            highestBid:           0,
            computeUnitsUsed:     0,
            storagePointer:       "",
            outputHash:           bytes32(0)
        });

        // Refund any overpayment immediately
        if (msg.value > totalRequired) {
            (bool ok,) = payable(msg.sender).call{value: msg.value - totalRequired}("");
            require(ok, "AH: overpayment refund failed");
        }

        emit TaskSubmitted(taskId, msg.sender, difficultyScore, reservePrice, tasks[taskId].bidDeadline);
    }

    // ─── Commit Phase ─────────────────────────────────────────────────────────

    /**
     * @notice Commit a sealed bid. Send collateral >= your intended bid amount.
     * @param taskId     The task to bid on
     * @param commitment keccak256(abi.encodePacked(bidAmount, salt))
     */
    function placeBid(uint256 taskId, bytes32 commitment) external payable nonReentrant {
        Task storage task = tasks[taskId];
        if (task.id == 0) revert TaskNotFound();
        if (task.state != TaskState.Open) revert InvalidState(task.state);
        if (block.timestamp > task.bidDeadline) revert BidWindowClosed();
        if (!stakeVault.hasMinimumStake(msg.sender)) revert AgentNotStaked();
        if (msg.value < task.reservePrice) revert InsufficientCollateral();

        // Cap bidder count to prevent gas-exhaustion DoS in clearAuction loop
        require(taskBidders[taskId].length < MAX_BIDDERS, "AH: max bidders reached");

        // One commitment per bidder per task
        require(bidCommitments[taskId][msg.sender].commitment == bytes32(0), "AH: already committed");

        bidCommitments[taskId][msg.sender] = BidCommitment({
            commitment:    commitment,
            revealedAmount: 0,
            revealed:      false,
            collateral:    msg.value
        });
        taskBidders[taskId].push(msg.sender);

        emit BidCommitted(taskId, msg.sender, commitment);
    }

    // ─── Reveal Phase ─────────────────────────────────────────────────────────

    /**
     * @notice Transition task to Revealing state. Callable by anyone after bid deadline.
     */
    function startRevealPhase(uint256 taskId) external {
        Task storage task = tasks[taskId];
        if (task.id == 0) revert TaskNotFound();
        if (task.state != TaskState.Open) revert InvalidState(task.state);
        if (block.timestamp <= task.bidDeadline) revert WindowStillOpen();
        task.state = TaskState.Revealing;
    }

    /**
     * @notice Reveal your actual bid. Contract verifies against the commitment hash.
     * @param taskId  The task
     * @param amount  Your actual bid in wei (must match commitment)
     * @param salt    The random salt used to generate your commitment
     */
    function revealBid(uint256 taskId, uint256 amount, bytes32 salt) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.id == 0) revert TaskNotFound();
        if (task.state != TaskState.Revealing) revert InvalidState(task.state);
        if (block.timestamp > task.revealDeadline) revert RevealWindowClosed();

        BidCommitment storage bid = bidCommitments[taskId][msg.sender];
        require(bid.commitment != bytes32(0), "AH: no commitment found");
        if (bid.revealed) revert AlreadyRevealed();

        // Verify the reveal matches the commitment
        if (keccak256(abi.encodePacked(amount, salt)) != bid.commitment) revert CommitmentMismatch();

        // Below-reserve bids: refund collateral and disqualify
        if (amount < task.reservePrice) {
            uint256 refund = bid.collateral;
            bid.collateral = 0;
            (bool ok,) = payable(msg.sender).call{value: refund}("");
            require(ok, "AH: below-reserve refund failed");
            return;
        }

        // Collateral must cover the revealed bid
        if (bid.collateral < amount) revert InsufficientCollateral();

        bid.revealedAmount = amount;
        bid.revealed       = true;

        emit BidRevealed(taskId, msg.sender, amount);
    }

    // ─── Auction Clearing (Vickrey) ───────────────────────────────────────────

    /**
     * @notice Clear the auction after reveal phase.
     *         Selects highest revealed bid as winner; winner pays second-highest price.
     *         Losing bidders' collateral is fully refunded.
     */
    function clearAuction(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.id == 0) revert TaskNotFound();
        require(
            task.state == TaskState.Revealing || task.state == TaskState.Open,
            "AH: cannot clear in current state"
        );
        if (block.timestamp <= task.revealDeadline) revert WindowStillOpen();

        address[] storage bidders = taskBidders[taskId];

        address winner           = address(0);
        uint256 highestBid       = 0;
        uint256 secondHighestBid = task.reservePrice; // floor at reserve price

        for (uint256 i = 0; i < bidders.length; i++) {
            BidCommitment storage bid = bidCommitments[taskId][bidders[i]];
            if (!bid.revealed) continue;

            if (bid.revealedAmount > highestBid) {
                // Previous highest becomes second
                secondHighestBid = highestBid > task.reservePrice ? highestBid : task.reservePrice;
                highestBid       = bid.revealedAmount;
                winner           = bidders[i];
            } else if (bid.revealedAmount > secondHighestBid) {
                secondHighestBid = bid.revealedAmount;
            }
        }

        // No valid bids — refund the task
        if (winner == address(0)) {
            _refundTask(taskId);
            return;
        }

        task.winner     = winner;
        task.highestBid = highestBid;
        task.winningBid = secondHighestBid; // Vickrey: pay second price
        task.state      = TaskState.Executing;

        // Return excess collateral to winner (they only lock winningBid amount)
        // Uses pull-payment: winner claims via claimRefund() to avoid reentrancy in loop
        BidCommitment storage winnerBid = bidCommitments[taskId][winner];
        if (winnerBid.collateral > task.winningBid) {
            uint256 excess = winnerBid.collateral - task.winningBid;
            winnerBid.collateral = task.winningBid;
            pendingRefunds[winner] += excess;
            emit RefundQueued(winner, excess, "winner excess collateral");
        }

        // Queue refunds for all losing bidders (pull-payment — avoids per-address revert blocking the loop)
        for (uint256 i = 0; i < bidders.length; i++) {
            if (bidders[i] == winner) continue;
            BidCommitment storage loserBid = bidCommitments[taskId][bidders[i]];
            if (loserBid.collateral > 0) {
                uint256 refund = loserBid.collateral;
                loserBid.collateral = 0;
                pendingRefunds[bidders[i]] += refund;
                emit RefundQueued(bidders[i], refund, "losing bid refund");
            }
        }

        emit AuctionCleared(taskId, winner, secondHighestBid, bidders.length);
        emit ExecutionStarted(taskId, winner, task.executeDeadline);
    }

    // ─── Execution Result Submission ──────────────────────────────────────────

    /**
     * @notice Winning executor submits inference result.
     *         Two-phase commit: this sets Completed state (Phase 2).
     *         Phase 1 was the Executing state set during clearAuction.
     * @param taskId          The task
     * @param storagePointer  0G Storage Log pointer where result is stored
     * @param outputHash      keccak256(output) for integrity verification by Auditor
     * @param computeUnitsUsed  Actual compute units consumed (from 0G Compute receipt)
     */
    function submitResult(
        uint256 taskId,
        string calldata storagePointer,
        bytes32 outputHash,
        uint256 computeUnitsUsed
    ) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.id == 0) revert TaskNotFound();
        if (task.state != TaskState.Executing) revert InvalidState(task.state);
        if (msg.sender != task.winner) revert NotWinner();
        if (block.timestamp > task.executeDeadline) revert ExecutionDeadlinePassed();
        require(bytes(storagePointer).length > 0, "AH: empty storage pointer");
        require(computeUnitsUsed > 0, "AH: zero compute units");

        task.storagePointer   = storagePointer;
        task.outputHash       = outputHash;
        task.computeUnitsUsed = computeUnitsUsed;
        task.state            = TaskState.Completed;

        totalTasksCompleted++;

        emit TaskCompleted(taskId, msg.sender, storagePointer, computeUnitsUsed);
    }

    /**
     * @notice Auditor submits the median efficiency score and triggers StakeVault settlement.
     *         Only callable by owner (auditor settlement bot) — governance upgrade path exists.
     * @param taskId           The task
     * @param efficiencyScore  0-100 score produced by Auditor agent consensus
     */
    function settleWithScore(uint256 taskId, uint256 efficiencyScore) external onlyOwner nonReentrant {
        Task storage task = tasks[taskId];
        if (task.state != TaskState.Completed) revert InvalidState(task.state);
        if (efficiencyScore > 100) revert ScoreOutOfRange();

        task.state = TaskState.Settled;

        stakeVault.processTaskSettlement(
            taskId,
            task.winner,
            task.winningBid,
            efficiencyScore,
            task.computeUnitsUsed
        );

        emit TaskSettled(taskId, efficiencyScore);
    }

    // ─── Refunds ──────────────────────────────────────────────────────────────

    /**
     * @notice Trigger refund for tasks that expired without completion. Callable by anyone.
     *         Missed-execution by winner triggers a slash via StakeVault before refund.
     */
    function refundExpiredTask(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.id == 0) revert TaskNotFound();

        bool canRefund = false;

        if (
            (task.state == TaskState.Open || task.state == TaskState.Revealing) &&
            block.timestamp > task.revealDeadline
        ) {
            canRefund = true;
        } else if (task.state == TaskState.Executing && block.timestamp > task.executeDeadline) {
            // Executor missed deadline — slash them (score = 0 = maximum slash)
            BidCommitment storage winnerBid = bidCommitments[taskId][task.winner];
            if (winnerBid.collateral > 0) {
                stakeVault.processTaskSettlement(taskId, task.winner, winnerBid.collateral, 0, 0);
                winnerBid.collateral = 0;
            }
            canRefund = true;
        }

        require(canRefund, "AH: task not refundable yet");
        _refundTask(taskId);
    }

    function _refundTask(uint256 taskId) internal {
        Task storage task = tasks[taskId];
        task.state = TaskState.Refunded;

        // Queue refunds for any remaining bidder collateral (pull-payment pattern)
        address[] storage bidders = taskBidders[taskId];
        for (uint256 i = 0; i < bidders.length; i++) {
            BidCommitment storage bid = bidCommitments[taskId][bidders[i]];
            if (bid.collateral > 0) {
                uint256 refund = bid.collateral;
                bid.collateral = 0;
                pendingRefunds[bidders[i]] += refund;
                emit RefundQueued(bidders[i], refund, "expired task bidder refund");
            }
        }

        // Refund submitter's reserve price (task fee stays as protocol revenue)
        // Direct call: single recipient, not in a loop
        uint256 reserveRefund = task.reservePrice;
        (bool ok,) = payable(task.submitter).call{value: reserveRefund}("");
        if (!ok) {
            // Submitter is a contract that rejected ETH — queue for pull-payment
            pendingRefunds[task.submitter] += reserveRefund;
            emit RefundQueued(task.submitter, reserveRefund, "task reserve refund");
        }

        emit TaskRefunded(taskId, task.submitter, reserveRefund);
    }

    /**
     * @notice Claim any queued refund owed to msg.sender.
     *         Pull-payment pattern — avoids per-address ETH push failures in loops.
     */
    function claimRefund() external nonReentrant {
        uint256 amount = pendingRefunds[msg.sender];
        require(amount > 0, "AH: no pending refund");
        pendingRefunds[msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "AH: refund transfer failed");
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setReservePricePerUnit(uint256 _price) external onlyOwner {
        require(_price > 0, "AH: zero price");
        reservePricePerUnit = _price;
    }

    function setStakeVault(address _vault) external onlyOwner {
        require(_vault != address(0), "AH: zero address");
        stakeVault = IStakeVault(_vault);
    }

    /**
     * @notice Withdraw accumulated protocol fees only.
     *         Locked bidder collateral and task reserves are NOT withdrawable —
     *         only the taskFee portion (1% of each task's reserve price) accumulates here.
     */
    function withdrawTreasury(address to) external onlyOwner nonReentrant {
        require(to != address(0), "AH: zero address");
        uint256 amount = protocolFees;
        require(amount > 0, "AH: no fees to withdraw");
        protocolFees = 0;
        (bool ok,) = payable(to).call{value: amount}("");
        require(ok, "AH: treasury transfer failed");
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }

    function getTaskBidders(uint256 taskId) external view returns (address[] memory) {
        return taskBidders[taskId];
    }

    function getBid(uint256 taskId, address bidder) external view returns (BidCommitment memory) {
        return bidCommitments[taskId][bidder];
    }

    function getActiveTasks() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= taskCount; i++) {
            TaskState s = tasks[i].state;
            if (s == TaskState.Open || s == TaskState.Revealing || s == TaskState.Executing) {
                count++;
            }
        }
        uint256[] memory ids = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= taskCount; i++) {
            TaskState s = tasks[i].state;
            if (s == TaskState.Open || s == TaskState.Revealing || s == TaskState.Executing) {
                ids[idx++] = i;
            }
        }
        return ids;
    }

    receive() external payable {}
}
