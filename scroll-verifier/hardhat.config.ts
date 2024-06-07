import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import { HardhatUserConfig } from 'hardhat/config';
import 'ethers';
const DEPLOYER_PRIVATE_KEY =
  process.env.DEPLOYER_PRIVATE_KEY ||
  'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const L1_PROVIDER_URL = process.env.L1_PROVIDER_URL || '';
const L1_ETHERSCAN_API_KEY = process.env.L1_ETHERSCAN_API_KEY;
const L2_ETHERSCAN_API_KEY = process.env.L2_ETHERSCAN_API_KEY;
console.log({
  DEPLOYER_PRIVATE_KEY,
  L1_PROVIDER_URL,
  L1_ETHERSCAN_API_KEY,
  L2_ETHERSCAN_API_KEY
})
const config: HardhatUserConfig = {
  solidity: '0.8.19',
  networks: {
    scrollDevnetL1: {
      url: 'http://127.0.0.1:8545/',
      accounts: [
        '0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659',
      ],
      deploy: ['deploy_l1/'],
      companionNetworks: {
        l2: 'scrollDevnetL2',
      },
    },
    scrollDevnetL2: {
      url: 'http://127.0.0.1:8547/',
      accounts: [
        '0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659',
      ],
      deploy: ['deploy_l2/'],
    },
    sepolia: {
      url: L1_PROVIDER_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
      deploy: ['deploy_l1/'],
      companionNetworks: {
        l2: 'scrollSepolia',
      },
      chainId: 11155111
    },
    scrollSepolia: {
      url: 'https://sepolia-rpc.scroll.io',
      accounts: [DEPLOYER_PRIVATE_KEY],
      deploy: [ "deploy_l2/" ],
      chainId: 534351
    },
  },
  etherscan: {
    apiKey: {
      goerli: L1_ETHERSCAN_API_KEY,
      sepolia: L1_ETHERSCAN_API_KEY,
      scrollGoerli: L2_ETHERSCAN_API_KEY,
      scrollSepolia: L2_ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "scrollSepolia",
        chainId: 534351,
        urls: {
          apiURL: "https://api-sepolia.scrollscan.com/api",
          browserURL: "https://sepolia.scrollscan.com"
        }
      }
    ],
  },
  namedAccounts: {
    deployer: 0,
  },
};

export default config;
