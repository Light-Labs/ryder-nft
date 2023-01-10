import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "hardhat-abi-exporter";
import "hardhat-gas-reporter";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY!;
const MAINNET_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY!;
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY!;

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  paths: {
    sources: "src",
    tests: "src/tests",
  },
  networks: {
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      accounts: [MAINNET_PRIVATE_KEY],
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      accounts: [GOERLI_PRIVATE_KEY],
    },
  },
  abiExporter: {},
  gasReporter: {
    enabled: true,
  },
};

export default config;
