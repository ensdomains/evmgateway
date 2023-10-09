import '@nomicfoundation/hardhat-toolbox';
import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  solidity: '0.8.19',
  networks: {
    ganache: {
      url: `http://localhost:${parseInt(process.env['RPC_PORT'] || '8545')}`,
    },
  },
};

export default config;
