// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AuctionHouse.sol";

/**
 * @title AuctionHouseDemo
 * @notice AuctionHouse variant with compressed time windows for local demo recording.
 *
 *   BID    window:  30 seconds
 *   REVEAL window:  20 seconds
 *   EXECUTE grace:  90 seconds
 *
 * Total cycle: ~2.5 minutes — fast enough to record in one take.
 * Deploy with: npx hardhat run scripts/demo.ts
 * (Targets local Hardhat network — never deploy to mainnet)
 */
contract AuctionHouseDemo is AuctionHouse {
    constructor(address _stakeVault) AuctionHouse(_stakeVault) {}

    function _bidWindow()    internal pure override returns (uint256) { return 30 seconds; }
    function _revealWindow() internal pure override returns (uint256) { return 20 seconds; }
    function _executeGrace() internal pure override returns (uint256) { return 90 seconds; }
}
