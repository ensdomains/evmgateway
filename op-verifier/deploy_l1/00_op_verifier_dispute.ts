import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import fs from 'fs';

const GATEWAY_URLS = {
  'sepolia': 'https://op-gateway-worker.optidomains.workers.dev/{sender}/{data}.json',
}

const DISPUTE_GAME_ADDRESSES = {
  'sepolia': '0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1',
}

const OPTIMISM_PORTAL_ADDRESSES = {
  'sepolia': '0x16Fc5058F25648194471939df75CF27A2fdC48BC',
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  // Skip deployment if chain is not specified
  if (!DISPUTE_GAME_ADDRESSES[network.name] || !OPTIMISM_PORTAL_ADDRESSES[network.name] || !GATEWAY_URLS[network.name]) {
    console.log('Skipping OPDisputeGameVerifier deployment...')
    return
  }

  let DISPUTE_GAME_ADDRESS, OPTIMISM_PORTAL_ADDRESS, GATEWAY_URL
  if(network.name === 'opDevnetL1'){
    const opAddresses = await (await fetch("http://localhost:8080/addresses.json")).json();
    DISPUTE_GAME_ADDRESS = opAddresses.L2OutputOracleProxy
  }else{
    DISPUTE_GAME_ADDRESS = DISPUTE_GAME_ADDRESSES[network.name]
  }
  OPTIMISM_PORTAL_ADDRESS = OPTIMISM_PORTAL_ADDRESSES[network.name]
  GATEWAY_URL = GATEWAY_URLS[network.name]
  console.log('OPDisputeGameVerifier', [[GATEWAY_URL], DISPUTE_GAME_ADDRESS, OPTIMISM_PORTAL_ADDRESS])
  await deploy('OPDisputeGameVerifier', {
    from: deployer,
    args: [[GATEWAY_URL], DISPUTE_GAME_ADDRESS, OPTIMISM_PORTAL_ADDRESS],
    log: true,
  });
};
export default func;
func.tags = ['OPDisputeGameVerifier'];
