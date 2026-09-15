require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // Enable via-IR pipeline to handle large/complex contracts and
      // avoid "stack too deep" compilation errors.
      viaIR: true,
    },
  },

  networks: {
    // Built-in in-process Hardhat network (used by default for tests)
    hardhat: {
      chainId: 31337,
    },

    // Local node started with `npx hardhat node`
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      // Use the first Hardhat test account when no PRIVATE_KEY is set
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },

  // Path configuration — keep defaults so artifacts live under ./artifacts
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  // Mocha settings for longer-running integration tests
  mocha: {
    timeout: 60_000,
  },
};
