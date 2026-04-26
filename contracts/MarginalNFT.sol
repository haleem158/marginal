// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MarginalNFT
 * @notice ERC-7857-inspired iNFT contract for MARGINAL Executor Agents.
 *
 * Each minted token represents one Executor Agent with:
 *   - Embedded "intelligence": pointer to model config on 0G Storage
 *   - Embedded "memory": pointer to the agent's full task-history Log on 0G Storage
 *   - Live performance stats: efficiency score, tasks completed
 *
 * Reputation lockup on transfer:
 *   When an iNFT is transferred, the new owner enters a 20-task probation period.
 *   During probation the historical efficiency score is escrowed — new owner must
 *   earn 20 scored tasks at their own baseline before the full score resumes.
 *   This prevents reputation renting.
 */
contract MarginalNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {

    // ─── Types ────────────────────────────────────────────────────────────────

    struct AgentMetadata {
        string  name;
        string  model;              // e.g. "qwen3.6-plus"
        string  intelligencePointer; // 0G Storage pointer to encrypted model config
        string  memoryLogPointer;    // 0G Storage Log pointer to task history
        string  memoryKVPointer;     // 0G Storage KV key for live state
        uint256 efficiencyScore;     // 0-10000 (mirrors StakeVault)
        uint256 tasksCompleted;
        uint256 mintedAt;
        address originalMinter;
    }

    struct TransferLockup {
        address newOwner;
        uint256 tasksAtTransfer;   // tasksCompleted when transfer happened
        uint256 requiredTasks;     // must complete this many before score resumes
        bool    active;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    mapping(uint256 => AgentMetadata)  public agentMetadata;
    mapping(uint256 => TransferLockup) public transferLockups;

    /// @dev Track which token belongs to which agent address (1:1 initially)
    mapping(address => uint256) public agentToToken;
    mapping(uint256 => address) public tokenToAgent;

    uint256 public nextTokenId = 1;
    address public stakeVault;  // trusted updater for performance stats

    uint256 public constant LOCKUP_TASK_COUNT = 20;

    // ─── Events ───────────────────────────────────────────────────────────────

    event AgentMinted(
        uint256 indexed tokenId,
        address indexed agent,
        string name,
        string model,
        string intelligencePointer
    );
    event PerformanceUpdated(
        uint256 indexed tokenId,
        uint256 efficiencyScore,
        uint256 tasksCompleted
    );
    event PointersUpdated(
        uint256 indexed tokenId,
        string memoryLogPointer,
        string memoryKVPointer
    );
    event TransferLockupActivated(uint256 indexed tokenId, address newOwner, uint256 requiredTasks);
    event TransferLockupCleared(uint256 indexed tokenId, address owner);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotStakeVault();
    error AgentAlreadyMinted();
    error TokenDoesNotExist();
    error NotTokenOwner();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _stakeVault)
        ERC721("Marginal Executor Agent", "MXEC")
        Ownable(msg.sender)
    {
        stakeVault = _stakeVault;
    }

    modifier onlyStakeVault() {
        if (msg.sender != stakeVault) revert NotStakeVault();
        _;
    }

    // ─── Minting ──────────────────────────────────────────────────────────────

    /**
     * @notice Mint an Executor Agent iNFT. One per agent address.
     * @param agentAddress          The wallet address this agent operates from
     * @param name                  Human-readable agent name (e.g. "Executor #001")
     * @param model                 Inference model identifier
     * @param intelligencePointer   0G Storage pointer to encrypted model config
     * @param memoryLogPointer      0G Storage Log stream ID for task history
     * @param memoryKVPointer       0G Storage KV key for live state
     * @param tokenURI_             Full metadata URI (points to 0G Storage JSON)
     */
    function mintAgent(
        address agentAddress,
        string calldata name,
        string calldata model,
        string calldata intelligencePointer,
        string calldata memoryLogPointer,
        string calldata memoryKVPointer,
        string calldata tokenURI_
    ) external onlyOwner nonReentrant {
        if (agentToToken[agentAddress] != 0) revert AgentAlreadyMinted();

        uint256 tokenId = nextTokenId++;

        _safeMint(agentAddress, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        agentMetadata[tokenId] = AgentMetadata({
            name:                 name,
            model:                model,
            intelligencePointer:  intelligencePointer,
            memoryLogPointer:     memoryLogPointer,
            memoryKVPointer:      memoryKVPointer,
            efficiencyScore:      7_000, // start at 70.00
            tasksCompleted:       0,
            mintedAt:             block.timestamp,
            originalMinter:       agentAddress
        });

        agentToToken[agentAddress] = tokenId;
        tokenToAgent[tokenId]      = agentAddress;

        emit AgentMinted(tokenId, agentAddress, name, model, intelligencePointer);
    }

    // ─── Performance Updates (called by StakeVault) ───────────────────────────

    /**
     * @notice Sync efficiency score and task count from StakeVault after settlement.
     *         Called by StakeVault (trusted) — keeps iNFT metadata live.
     */
    function updatePerformance(
        uint256 tokenId,
        uint256 efficiencyScore,
        uint256 tasksCompleted
    ) external onlyStakeVault {
        if (!_tokenExists(tokenId)) revert TokenDoesNotExist();

        AgentMetadata storage meta = agentMetadata[tokenId];
        meta.efficiencyScore = efficiencyScore;
        meta.tasksCompleted  = tasksCompleted;

        // Check if lockup period should be cleared
        TransferLockup storage lockup = transferLockups[tokenId];
        if (lockup.active) {
            if (tasksCompleted >= lockup.tasksAtTransfer + lockup.requiredTasks) {
                lockup.active = false;
                emit TransferLockupCleared(tokenId, ownerOf(tokenId));
            }
        }

        emit PerformanceUpdated(tokenId, efficiencyScore, tasksCompleted);
    }

    /**
     * @notice Update 0G Storage pointers (called by Memory Indexer agent via owner).
     */
    function updatePointers(
        uint256 tokenId,
        string calldata memoryLogPointer,
        string calldata memoryKVPointer
    ) external onlyOwner {
        if (!_tokenExists(tokenId)) revert TokenDoesNotExist();

        AgentMetadata storage meta = agentMetadata[tokenId];
        meta.memoryLogPointer = memoryLogPointer;
        meta.memoryKVPointer  = memoryKVPointer;

        emit PointersUpdated(tokenId, memoryLogPointer, memoryKVPointer);
    }

    // ─── Transfer Lockup ──────────────────────────────────────────────────────

    /**
     * @dev Override transfer to activate reputation lockup.
     *      New owner must complete LOCKUP_TASK_COUNT tasks before historical score resumes.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = super._update(to, tokenId, auth);

        // Skip lockup for mint (from == address(0)) and burn
        if (from != address(0) && to != address(0)) {
            AgentMetadata storage meta = agentMetadata[tokenId];

            transferLockups[tokenId] = TransferLockup({
                newOwner:        to,
                tasksAtTransfer: meta.tasksCompleted,
                requiredTasks:   LOCKUP_TASK_COUNT,
                active:          true
            });

            // Reset score to neutral during lockup (real score escrowed off-chain)
            meta.efficiencyScore = 5_000; // 50.00 — neutral until proven

            emit TransferLockupActivated(tokenId, to, LOCKUP_TASK_COUNT);
        }

        return from;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setStakeVault(address _stakeVault) external onlyOwner {
        require(_stakeVault != address(0), "MN: zero address");
        stakeVault = _stakeVault;
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getAgentMetadata(uint256 tokenId) external view returns (AgentMetadata memory) {
        if (!_tokenExists(tokenId)) revert TokenDoesNotExist();
        return agentMetadata[tokenId];
    }

    function isInLockup(uint256 tokenId) external view returns (bool) {
        return transferLockups[tokenId].active;
    }

    function _tokenExists(uint256 tokenId) internal view returns (bool) {
        // _ownerOf returns address(0) for burned or never-minted tokens
        return _ownerOf(tokenId) != address(0);
    }

    // ─── ERC-721 Overrides ────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
