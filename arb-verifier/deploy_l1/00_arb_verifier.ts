import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import fs from 'fs';

const GATEWAY_URLS = {
  'opDevnetL1': 'http://localhost:8089/{sender}/{data}.json',
  'goerli': 'http://localhost:8089/{sender}/{data}.json',
}

const L2_OUTPUT_ORACLE_ADDRESSES = {
  'goerli': '0xE6Dfba0953616Bacab0c9A8ecb3a9BBa77FC15c0'
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
    L2_OUTPUT_ORACLE_ADDRESS = L2_OUTPUT_ORACLE_ADDRESSES[network.name]
  }
  console.log('OPVerifier', [[GATEWAY_URL], L2_OUTPUT_ORACLE_ADDRESS])
  await deploy('OPVerifier', {
    from: deployer,
    args: [[GATEWAY_URLS[network.name]], L2_OUTPUT_ORACLE_ADDRESS],
    log: true,
  });
};
export default func;
func.tags = ['OPVerifier'];
