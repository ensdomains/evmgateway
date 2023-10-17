import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import fs from 'fs';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  let L2_OUTPUT_ORACLE_ADDRESS, GATEWAY_URL
  if(network.name === 'opDevnetL1'){
    GATEWAY_URL = 'http://localhost:8080/{sender}/{data}.json'
    const opAddresses = await (await fetch("http://localhost:8080/addresses.json")).json();
    L2_OUTPUT_ORACLE_ADDRESS = opAddresses.L2OutputOracleProxy
  }else if('goerli'){
    GATEWAY_URL = 'https://op-gateway-worker.ens-cf.workers.dev/{sender}/{data}.json'
    L2_OUTPUT_ORACLE_ADDRESS = '0xE6Dfba0953616Bacab0c9A8ecb3a9BBa77FC15c0'
  }
  console.log('OPVerifier', [[GATEWAY_URL], L2_OUTPUT_ORACLE_ADDRESS])
  await deploy('OPVerifier', {
    from: deployer,
    args: [[GATEWAY_URL], L2_OUTPUT_ORACLE_ADDRESS],
    log: true,
  });
};
export default func;
func.tags = ['OPVerifier'];
