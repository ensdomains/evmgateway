import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import 'dotenv/config';

const GATEWAY_URLS = {
  arbDevnetL1: 'http://localhost:8089/{sender}/{data}.json',
  goerli: 'https://arb-gateway-worker.ens-cf.workers.dev/{sender}/{data}.json',
  sepolia: 'https://arb-sepolia-gateway-worker.ens-cf.workers.dev/{sender}/{data}.json',
};

const ROLLUP_ADDRESSES = {
  goerli: '0x45e5cAea8768F42B385A366D3551Ad1e0cbFAb17',
  sepolia: '0xd80810638dbDF9081b72C1B33c65375e807281C8',
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  let ROLLUP_ADDRESS;
  if (network.name === 'arbDevnetL1') {
    //Rollup address according to sequencer config. Unfortunately, there is no endpoint to fetch it at runtime from the rollup.
    //The address can be found at nitro-testnode-sequencer-1/config/deployment.json 
    ROLLUP_ADDRESS = process.env.ROLLUP_ADDRESS;
  } else {
    ROLLUP_ADDRESS = ROLLUP_ADDRESSES[network.name];
  }
  const GATEWAY_URL = GATEWAY_URLS[network.name];
  console.log('ArbVerifier', [[GATEWAY_URL], ROLLUP_ADDRESS]);
  await deploy('ArbVerifier', {
    from: deployer,
    args: [[GATEWAY_URL], ROLLUP_ADDRESS],
    log: true,
  });
};
export default func;
func.tags = ['ArbVerifier'];
