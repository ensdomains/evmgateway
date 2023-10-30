import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  console.log({deployer})
  await deploy('OwnedResolver', {
    from: deployer,
    args: [],
    log: true,
  });
};
export default func;
func.tags = ['OwnedResolver'];
