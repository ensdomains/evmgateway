import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const GATEWAY_URLS = {
  'opDevnetL1': 'http://localhost:8089/{sender}/{data}.json',
  'goerli': 'http://localhost:8089/{sender}/{data}.json',
}

const ROLLUP_ADDRESSES = {
  'goerli': '0x45e5cAea8768F42B385A366D3551Ad1e0cbFAb17'
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  let L2_OUTPUT_ORACLE_ADDRESS, GATEWAY_URL
  if (network.name === 'opDevnetL1') {
    const opAddresses = await (await fetch("http://localhost:8080/addresses.json")).json();
    L2_OUTPUT_ORACLE_ADDRESS = opAddresses.L2OutputOracleProxy
  } else {
    L2_OUTPUT_ORACLE_ADDRESS = ROLLUP_ADDRESSES[network.name]
  }
  console.log('ArbVerifier', [[GATEWAY_URL], L2_OUTPUT_ORACLE_ADDRESS])
  await deploy('ArbVerifier', {
    from: deployer,
    args: [[GATEWAY_URLS[network.name]], L2_OUTPUT_ORACLE_ADDRESS],
    log: true,
  });
};
export default func;
func.tags = ['ArbVerifier'];
