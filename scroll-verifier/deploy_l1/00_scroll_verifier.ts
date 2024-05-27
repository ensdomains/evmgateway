import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import 'dotenv/config';

const GATEWAY_URLS = {
  scrollDevnetL1: 'http://localhost:8089/{sender}/{data}.json',
  goerli: 'https://scroll-gateway-worker.ens-cf.workers.dev/{sender}/{data}.json',
  // Point to localhost if you want to test locally
  // sepolia: 'http://localhost:8080/{sender}/{data}.json'
  sepolia: 'https://scroll-sepolia-gateway-worker.ens-cf.workers.dev/{sender}/{data}.json',
};

const ROLLUP_ADDRESSES = {
  sepolia: '0xE0BfA7f3B06A9589A914BE09Ba0E5671f481A722',
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  let ROLLUP_ADDRESS;
  if (network.name === 'scrollDevnetL1') {
    //Rollup address according to sequencer config. Unfortunately, there is no endpoint to fetch it at runtime from the rollup.
    //The address can be found at nitro-testnode-sequencer-1/config/deployment.json 
    ROLLUP_ADDRESS = process.env.ROLLUP_ADDRESS;
  } else {
    ROLLUP_ADDRESS = ROLLUP_ADDRESSES[network.name];
  }
  const GATEWAY_URL = GATEWAY_URLS[network.name];
  console.log('ScrollVerifier', [[GATEWAY_URL], ROLLUP_ADDRESS]);
  await deploy('ScrollVerifier', {
    from: deployer,
    args: [[GATEWAY_URL], ROLLUP_ADDRESS],
    log: true,
  });
};
export default func;
func.tags = ['ScrollVerifier'];
