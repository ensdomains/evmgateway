import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const VERIFIER_ADDRESS = process.env.VERIFIER_ADDRESS
  if(!VERIFIER_ADDRESS) throw ('Set $VERIFIER_ADDRESS')
  console.log({VERIFIER_ADDRESS})
  await deploy('L1Resolver', {
    from: deployer,
    args: [VERIFIER_ADDRESS],
    log: true,
  });
};
export default func;
func.tags = ['L1Resolver'];
