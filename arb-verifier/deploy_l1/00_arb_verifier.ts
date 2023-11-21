import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const GATEWAY_URLS = {
  arbDevnetL1: 'http://localhost:8089/{sender}/{data}.json',
  goerli: 'http://localhost:8089/{sender}/{data}.json',
};

const ROLLUP_ADDRESSES = {
  goerli: '0x45e5cAea8768F42B385A366D3551Ad1e0cbFAb17',
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  let ROLLUP_ADDRESS, GATEWAY_URL;
  console.log("NW ", network.name)
  if (network.name === 'arbDevnetL1') {
    //Rollup address according to sequencer config. Unfortunately, there is no endpoint to fetch it at runtime from the rollup.
    //The address can be found at nitro-testnode-sequencer-1/config/deployment.json 
    const rollup = '0xb264babb91df9d1ca05c8c2028288dc08c4bee46';
    ROLLUP_ADDRESS = rollup;
  } else {
    ROLLUP_ADDRESS = ROLLUP_ADDRESSES[network.name];
  }
  console.log('ArbVerifier', [[GATEWAY_URL], ROLLUP_ADDRESS]);
  await deploy('ArbVerifier', {
    from: deployer,
    args: [[GATEWAY_URLS[network.name]], ROLLUP_ADDRESS],
    log: true,
  });
};
export default func;
func.tags = ['ArbVerifier'];
