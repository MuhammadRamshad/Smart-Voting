const path = require("path");
require("@nomicfoundation/hardhat-toolbox");

// Load root .env
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config(); // fallback to local if present

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },

  networks: {
    hardhat: {
      chainId: 31337,
    },

    localhost: {
      url: process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 60_000,
  },
};
