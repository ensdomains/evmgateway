import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const NAMEWRAPPER = {
  'sepolia': '0x0635513f179D50A207757E05759CbD106d7dFcE8',
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const OP_VERIFIER_ADDRESS = process.env.OP_VERIFIER_ADDRESS
  if(!OP_VERIFIER_ADDRESS) throw ('Set $OP_VERIFIER_ADDRESS')
  console.log({OP_VERIFIER_ADDRESS})
  await deploy('L1Resolver', {
    from: deployer,
    args: [
      OP_VERIFIER_ADDRESS,
      '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
      NAMEWRAPPER[hre.network.name],
    ],
    log: true,
  });
};
export default func;
func.tags = ['L1Resolver'];
