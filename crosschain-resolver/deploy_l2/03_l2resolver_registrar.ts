import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat'
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  const DelegatableResolverFactory = await deployments.get('DelegatableResolverFactory');
  const abi = [
    "function predictAddress(address) view returns (address)"
  ]
  const l2Factory = new ethers.Contract(DelegatableResolverFactory.address, abi, ethers.provider);
  const l2resolverAddress = await l2Factory.predictAddress(deployer)  
  const impl = await deploy('DelegatableResolverRegistrar', {
    from: deployer,
    args: [l2resolverAddress],
    log: true,
  });
  const implAddress  = impl.address  
  console.log(`DelegatableResolverRegistrar is deployed at ${implAddress}`)
};
export default func;
module.exports.dependencies = ['DelegatableResolverFactory'];
func.tags = ['DelegatableResolverRegistrar'];

