import "@nomiclabs/hardhat-etherscan";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-preprocessor";
import fs from "fs";
import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import { NetworkUserConfig } from "hardhat/types";
dotenvConfig({ path: resolve(__dirname, "./.env") });

function getRemappings() {
  return fs
    .readFileSync("remappings.txt", "utf8")
    .split("\n")
    .filter(Boolean) // remove empty lines
    .map(line => line.trim().split("="));
}
const ethereumChainIds = {
  mainnet: 1,
  goerli: 5,
  hardhat: 31337,
};

// Ensure that we have all the environment variables we need.
let mnemonic: string;
if (!process.env.MNEMONIC) {
  throw new Error("Please set your MNEMONIC in a .env file");
} else {
  mnemonic = process.env.MNEMONIC;
}

let rpcToken: string;
if (!process.env.RPC_TOKEN) {
  throw new Error("Please set your RPC_TOKEN in a .env file");
} else {
  rpcToken = process.env.RPC_TOKEN;
}

let etherscanApiKey: string;
if (!process.env.ETHERSCAN_API_KEY) {
  throw new Error("Please set your ETHERSCAN_API_KEY in a .env file");
} else {
  etherscanApiKey = process.env.ETHERSCAN_API_KEY;
}

function createETHConfig(network: keyof typeof ethereumChainIds): NetworkUserConfig {
  const url = `https://eth-${network}.g.alchemy.com/v2/${rpcToken}`;
  return createConfigWithUrl(url, ethereumChainIds[network]);
}

function createConfigWithUrl(url: string, chainId: number): NetworkUserConfig {
  return {
    accounts: {
      count: 10,
      initialIndex: 0,
      mnemonic,
      path: "m/44'/60'/0'/0",
    },
    chainId,
    url,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts: {
        mnemonic,
      },
      chainId: 1,
    },
    fork: {
      accounts: {
        mnemonic,
      },
      forking: { url: `https://eth-mainnet.g.alchemy.com/v2/${rpcToken}`, blockNumber: 15632583 },
      chainId: 1,
      url: "http://localhost:8545",
    },
    goerli: createETHConfig("goerli"),
    mainnet: createETHConfig("mainnet"),
  },
  etherscan: {
    apiKey: etherscanApiKey,
  },
  preprocess: {
    eachLine: hre => ({
      transform: (line: string) => {
        if (line.match(/^\s*import /i)) {
          for (const [from, to] of getRemappings()) {
            if (line.includes(from)) {
              line = line.replace(from, to);
              break;
            }
          }
        }
        return line;
      },
    }),
  },
  paths: {
    sources: "./src",
    cache: "./cache_hardhat",
  },
  solidity: {
    version: "0.8.16",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/solidity-template/issues/31
        bytecodeHash: "none",
      },
      // You should disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  mocha: {
    timeout: 30000,
  },
};

export default config;
