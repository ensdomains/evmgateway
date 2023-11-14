import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  console.log({deployer})
    const REVERSE_NAMESPACE = process.env.REVERSE_NAMESPACE
  if(!REVERSE_NAMESPACE) throw ('Set $REVERSE_NAMESPACE')

  // eg: `${opcointype}.reverse`
  const reversenode = ethers.namehash(REVERSE_NAMESPACE)
  console.log({REVERSE_NAMESPACE, reversenode})
  await deploy('L2ReverseRegistrar', {
    from: deployer,
    args: [reversenode],
    log: true,
    gasPrice:20000007,
    gas:20000007
  });
};
export default func;
func.tags = ['L2ReverseRegistrar'];
