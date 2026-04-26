// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StakeVault
 * @notice Manages agent staking, reward distribution, and slashing for MARGINAL.
 *
 * Economic mechanics:
 *  - Agents stake A0GI to participate in auctions (skin-in-the-game).
 *  - After each task, efficiency score determines reward or slash.
 *  - Soft slash floor: max 10% slash in early epochs (epoch < 3), scales up.
 *  - Bootstrap subsidy: pre-funded treasury; first 200 tasks earn 20% bonus.
 *  - Score decay: EWA (exponentially weighted average) with α = 0.15.
 *  - Challenger bonus: first 50 tasks per agent get a favorable multiplier.
 */
contract StakeVault is Ownable, ReentrancyGuard {

    // ─── Types ────────────────────────────────────────────────────────────────

    struct AgentRecord {
        uint256 totalStake;          // current locked stake (wei)
        uint256 lifetimeRewards;     // total rewards earned (wei)
        uint256 lifetimeSlashed;     // total slashed (wei)
        uint256 tasksCompleted;      // total tasks executed
        uint256 efficiencyScore;     // EWA score 0-10000 (100.00 = perfect)
        uint256 registeredAt;        // block timestamp of registration
        bool    registered;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    mapping(address => AgentRecord) public agents;

    /// @dev Total tasks settled across all agents — drives epoch calculation
    uint256 public totalTasksSettled;

    /// @dev Bootstrap subsidy pool: pre-funded; only used for early-epoch bonuses
    uint256 public bootstrapSubsidy;

    /// @dev Minimum stake to participate in auctions
    uint256 public minStakeAmount;

    address public auctionHouse;

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant EPOCH_SIZE                = 100;   // tasks per epoch
    uint256 public constant EARLY_EPOCH_BONUS_TASKS   = 200;   // first N tasks system-wide get bonus
    uint256 public constant EARLY_EPOCH_BONUS_BPS     = 2_000; // 20% bonus
    uint256 public constant CHALLENGER_TASK_THRESHOLD = 50;    // first 50 tasks per agent

    /// @dev Efficiency threshold for reward vs. slash (score out of 100)
    uint256 public constant EFFICIENCY_THRESHOLD = 60;

    /// @dev Early epoch soft slash floor: max 10% of bid regardless of score
    uint256 public constant EARLY_SLASH_FLOOR_BPS = 1_000; // 10%
    /// @dev Soft slash scales up 5% per epoch until epoch 5 (full slash from epoch 5+)
    uint256 public constant SLASH_SCALE_BPS_PER_EPOCH = 500;

    /// @dev EWA decay factor numerator (α = 0.15 → new = 0.85*old + 0.15*new)
    uint256 public constant EWA_ALPHA_NUM = 15;
    uint256 public constant EWA_ALPHA_DEN = 100;

    // ─── Events ───────────────────────────────────────────────────────────────

    event AgentRegistered(address indexed agent);
    event AgentStaked(address indexed agent, uint256 amount, uint256 totalStake);
    event AgentUnstaked(address indexed agent, uint256 amount);
    event RewardDistributed(
        address indexed agent,
        uint256 indexed taskId,
        uint256 reward,
        uint256 efficiencyScore
    );
    event AgentSlashed(
        address indexed agent,
        uint256 indexed taskId,
        uint256 slashAmount,
        uint256 efficiencyScore
    );
    event EfficiencyScoreUpdated(address indexed agent, uint256 oldScore, uint256 newScore);
    event BootstrapSubsidyFunded(uint256 amount);
    event BootstrapSubsidyWithdrawn(uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotAuctionHouse();
    error AgentNotRegistered();
    error AlreadyRegistered();
    error InsufficientStake();
    error InsufficientBalance();
    error ZeroAddress();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(uint256 _minStakeAmount) Ownable(msg.sender) {
        minStakeAmount = _minStakeAmount;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAuctionHouse() {
        if (msg.sender != auctionHouse) revert NotAuctionHouse();
        _;
    }

    // ─── Agent Registration & Staking ─────────────────────────────────────────

    /**
     * @notice Register as an agent and stake A0GI to participate in auctions.
     */
    function registerAndStake() external payable nonReentrant {
        if (agents[msg.sender].registered) revert AlreadyRegistered();
        if (msg.value < minStakeAmount) revert InsufficientStake();

        agents[msg.sender] = AgentRecord({
            totalStake:      msg.value,
            lifetimeRewards: 0,
            lifetimeSlashed: 0,
            tasksCompleted:  0,
            efficiencyScore: 7_000, // start at 70.00 — neutral rating
            registeredAt:    block.timestamp,
            registered:      true
        });

        emit AgentRegistered(msg.sender);
        emit AgentStaked(msg.sender, msg.value, msg.value);
    }

    /**
     * @notice Add more stake (e.g., after receiving rewards or to increase bid capacity).
     */
    function addStake() external payable nonReentrant {
        if (!agents[msg.sender].registered) revert AgentNotRegistered();
        agents[msg.sender].totalStake += msg.value;
        emit AgentStaked(msg.sender, msg.value, agents[msg.sender].totalStake);
    }

    /**
     * @notice Withdraw stake above the minimum requirement.
     */
    function withdrawStake(uint256 amount) external nonReentrant {
        AgentRecord storage agent = agents[msg.sender];
        if (!agent.registered) revert AgentNotRegistered();
        if (agent.totalStake < minStakeAmount + amount) revert InsufficientStake();

        agent.totalStake -= amount;
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "SV: transfer failed");

        emit AgentUnstaked(msg.sender, amount);
    }

    // ─── Settlement (called by AuctionHouse) ─────────────────────────────────

    /**
     * @notice Process reward or slash after an Auditor scores a completed task.
     *         Called exclusively by AuctionHouse.settleWithScore().
     *
     * @param taskId           Task identifier (for event indexing)
     * @param executor         The winning executor address
     * @param bidAmount        The second-price amount the executor pays/paid
     * @param efficiencyScore  0-100 score from Auditor consensus (0 = worst, 100 = best)
     * @param computeUnitsUsed Actual units consumed (informational for off-chain analytics)
     */
    function processTaskSettlement(
        uint256 taskId,
        address executor,
        uint256 bidAmount,
        uint256 efficiencyScore,
        uint256 computeUnitsUsed
    ) external onlyAuctionHouse nonReentrant {
        AgentRecord storage agent = agents[executor];
        if (!agent.registered) revert AgentNotRegistered();

        totalTasksSettled++;

        // Update EWA efficiency score
        uint256 oldScore = agent.efficiencyScore;
        uint256 newRawScore = efficiencyScore * 100; // scale to 0-10000
        uint256 newScore = (oldScore * (EWA_ALPHA_DEN - EWA_ALPHA_NUM) + newRawScore * EWA_ALPHA_NUM)
            / EWA_ALPHA_DEN;
        agent.efficiencyScore = newScore;
        agent.tasksCompleted++;

        emit EfficiencyScoreUpdated(executor, oldScore, newScore);

        if (efficiencyScore >= EFFICIENCY_THRESHOLD) {
            _distributeReward(taskId, executor, bidAmount, efficiencyScore, agent);
        } else {
            _slashAgent(taskId, executor, bidAmount, efficiencyScore, agent);
        }

        // Suppress unused variable warning
        computeUnitsUsed;
    }

    // ─── Internal: Reward ─────────────────────────────────────────────────────

    function _distributeReward(
        uint256 taskId,
        address executor,
        uint256 bidAmount,
        uint256 efficiencyScore,
        AgentRecord storage agent
    ) internal {
        // Base reward = bidAmount (what they would have paid)
        // Efficiency multiplier: score 60 → 1.0×; score 100 → 1.8×
        // formula: multiplier = 1 + ((score - 60) / 40) * 0.8 → reward = bid * (1 + 0.02*(score-60))
        uint256 efficiencyBonus = ((efficiencyScore - EFFICIENCY_THRESHOLD) * bidAmount * 2) / 100;
        uint256 reward = bidAmount + efficiencyBonus;

        // Challenger bonus: first 50 tasks per agent get 10% extra
        if (agent.tasksCompleted <= CHALLENGER_TASK_THRESHOLD) {
            reward = reward + (reward / 10);
        }

        // Early epoch bootstrap bonus: first 200 system-wide tasks get 20% extra from subsidy
        if (totalTasksSettled <= EARLY_EPOCH_BONUS_TASKS && bootstrapSubsidy > 0) {
            uint256 subsidy = (bidAmount * EARLY_EPOCH_BONUS_BPS) / 10_000;
            if (subsidy > bootstrapSubsidy) subsidy = bootstrapSubsidy;
            bootstrapSubsidy -= subsidy;
            reward += subsidy;
        }

        // Cap reward by available contract balance
        uint256 available = address(this).balance;
        if (reward > available) reward = available;

        agent.totalStake       += reward;
        agent.lifetimeRewards  += reward;

        (bool ok,) = payable(executor).call{value: reward}("");
        require(ok, "SV: reward transfer failed");

        emit RewardDistributed(executor, taskId, reward, efficiencyScore);
    }

    // ─── Internal: Slash ──────────────────────────────────────────────────────

    function _slashAgent(
        uint256 taskId,
        address executor,
        uint256 bidAmount,
        uint256 efficiencyScore,
        AgentRecord storage agent
    ) internal {
        // Full slash would be: (1 - score/60) * bidAmount
        // Soft slash floor limits this in early epochs
        uint256 currentEpoch = totalTasksSettled / EPOCH_SIZE;

        uint256 fullSlashBps;
        if (efficiencyScore == 0) {
            fullSlashBps = 10_000; // 100% — missed deadline
        } else {
            // Proportional: (THRESHOLD - score) / THRESHOLD * 100%
            fullSlashBps = ((EFFICIENCY_THRESHOLD - efficiencyScore) * 10_000) / EFFICIENCY_THRESHOLD;
        }

        // Apply soft slash floor: max slash in epoch N = floor + N * scale (capped at 100%)
        uint256 maxSlashBps;
        if (currentEpoch < 5) {
            maxSlashBps = EARLY_SLASH_FLOOR_BPS + (currentEpoch * SLASH_SCALE_BPS_PER_EPOCH);
        } else {
            maxSlashBps = 10_000;
        }

        if (fullSlashBps > maxSlashBps) fullSlashBps = maxSlashBps;

        uint256 slashAmount = (bidAmount * fullSlashBps) / 10_000;

        // Cannot slash more than agent's stake
        if (slashAmount > agent.totalStake) slashAmount = agent.totalStake;

        agent.totalStake      -= slashAmount;
        agent.lifetimeSlashed += slashAmount;

        // Slashed funds go to the contract (treasury for future rewards)
        emit AgentSlashed(executor, taskId, slashAmount, efficiencyScore);
    }

    // ─── Bootstrap Subsidy ────────────────────────────────────────────────────

    /**
     * @notice Pre-fund the bootstrap subsidy pool. Called by deployer / DAO.
     */
    function fundBootstrapSubsidy() external payable onlyOwner {
        bootstrapSubsidy += msg.value;
        emit BootstrapSubsidyFunded(msg.value);
    }

    function withdrawBootstrapSubsidy(address to) external onlyOwner {
        require(to != address(0), "SV: zero address");
        // Only withdrawable after early epoch period ends
        require(totalTasksSettled > EARLY_EPOCH_BONUS_TASKS, "SV: early epoch active");
        uint256 amount = bootstrapSubsidy;
        bootstrapSubsidy = 0;
        (bool ok,) = payable(to).call{value: amount}("");
        require(ok, "SV: subsidy transfer failed");
        emit BootstrapSubsidyWithdrawn(amount);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setAuctionHouse(address _auctionHouse) external onlyOwner {
        if (_auctionHouse == address(0)) revert ZeroAddress();
        auctionHouse = _auctionHouse;
    }

    function setMinStakeAmount(uint256 _amount) external onlyOwner {
        require(_amount > 0, "SV: zero stake amount");
        minStakeAmount = _amount;
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function hasMinimumStake(address agent) external view returns (bool) {
        return agents[agent].registered && agents[agent].totalStake >= minStakeAmount;
    }

    function getAgentRecord(address agent) external view returns (AgentRecord memory) {
        return agents[agent];
    }

    function currentEpoch() external view returns (uint256) {
        return totalTasksSettled / EPOCH_SIZE;
    }

    function getLeaderboard(address[] calldata agentList)
        external
        view
        returns (
            address[] memory addrs,
            uint256[] memory scores,
            uint256[] memory tasks_,
            uint256[] memory stakes
        )
    {
        uint256 n = agentList.length;
        addrs  = new address[](n);
        scores = new uint256[](n);
        tasks_ = new uint256[](n);
        stakes = new uint256[](n);

        for (uint256 i = 0; i < n; i++) {
            AgentRecord storage a = agents[agentList[i]];
            addrs[i]  = agentList[i];
            scores[i] = a.efficiencyScore;
            tasks_[i] = a.tasksCompleted;
            stakes[i] = a.totalStake;
        }
    }

    receive() external payable {}
}
