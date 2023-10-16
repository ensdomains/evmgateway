import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import fs from 'fs';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const opAddresses = await (await fetch("http://localhost:8080/addresses.json")).json();

  await deploy('OPVerifier', {
    from: deployer,
    args: [['test:'], opAddresses.L2OutputOracleProxy],
    log: true,
  });
};
export default func;
func.tags = ['OPVerifier'];
