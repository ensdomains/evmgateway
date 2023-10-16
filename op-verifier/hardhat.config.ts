import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  solidity: '0.8.19',
  networks: {
    opDevnetL1: {
      url: "http://localhost:8545/",
      accounts: ["ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
      deploy: [ "deploy_l1/" ],
      companionNetworks: {
        l2: "opDevnetL2",
      },
    },
    opDevnetL2: {
      url: "http://localhost:9545/",
      accounts: ["ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
      deploy: [ "deploy_l2/" ],
    },
  },
  namedAccounts: {
    'deployer': 0,
  }
};

export default config;
