import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Require a real private key for live network deployments.
// The zero-key fallback is only safe for local Hardhat network testing.
const RAW_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const KEY_VALID = /^0x[0-9a-fA-F]{64}$/.test(RAW_KEY);
const LIVE_NETWORKS = ["og-testnet", "og-mainnet"];

// Detect if a live network is targeted and block deployment without a valid key
const isLiveNetwork = process.argv.some((arg) => LIVE_NETWORKS.includes(arg));
if (isLiveNetwork && !KEY_VALID) {
  throw new Error(
    "DEPLOYER_PRIVATE_KEY is missing or invalid in .env. " +
    "Expected format: 0x followed by exactly 64 hex characters. " +
    "Refusing to deploy to a live network without a valid key."
  );
}

const PRIVATE_KEY = KEY_VALID ? RAW_KEY : "0x" + "0".repeat(64);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
  networks: {
    "og-testnet": {
      url: process.env.OG_TESTNET_RPC || "https://evmrpc-testnet.0g.ai",
      chainId: 16602,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
    "og-mainnet": {
      url: process.env.OG_MAINNET_RPC || "https://evmrpc.0g.ai",
      chainId: 16601,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      "og-testnet": process.env.OG_EXPLORER_API_KEY || "placeholder",
    },
    customChains: [
      {
        network: "og-testnet",
        chainId: 16600,
        urls: {
          apiURL: "https://chainscan-galileo.0g.ai/api",
          browserURL: "https://chainscan-galileo.0g.ai",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
