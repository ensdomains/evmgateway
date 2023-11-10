import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {deploy} = deployments;
  const DelegatableResolver = await hre.companionNetworks['l2'].deployments.get('DelegatableResolver');
  console.log({DelegatableResolver})
  const factory = await deploy('DelegatableResolverFactory', {
    from: deployer,
    args: [DelegatableResolver.address],
    log: true
  });
  console.log(`DelegatableResolverFactory is deployed at ${factory.address} with ${DelegatableResolver.address}`)
};
export default func;
module.exports.dependencies = ['DelegatableResolver'];
func.tags = ['DelegatableResolverFactory'];
