import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  console.log({deployer})
  const impl = await deploy('DelegatableResolver', {
    from: deployer,
    args: [],
    log: true,
  });
  const implAddress  = impl.address  
  console.log(`DelegatableResolver is deployed at ${implAddress}`)
  const factory = await deploy('DelegatableResolverFactory', {
    from: deployer,
    args: [impl.address],
    log: true,
  });
  await factory.wait()
  console.log(`DelegatableResolverFactory is deployed at ${factory.address}`)
};
export default func;
func.tags = ['DelegatableResolver'];
