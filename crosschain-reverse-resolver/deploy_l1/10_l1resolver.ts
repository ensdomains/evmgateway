import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const VERIFIER_ADDRESS = process.env.VERIFIER_ADDRESS
  const L2_REVERSE_REGISTRAR_ADDRESS = process.env.L2_REVERSE_REGISTRAR_ADDRESS
  if(!VERIFIER_ADDRESS) throw ('Set $VERIFIER_ADDRESS')
  if(!L2_REVERSE_REGISTRAR_ADDRESS) throw ('Set $L2_REVERSE_REGISTRAR_ADDRESS')
  console.log({VERIFIER_ADDRESS, L2_REVERSE_REGISTRAR_ADDRESS})
  await deploy('L1ReverseResolver', {
    from: deployer,
    args: [VERIFIER_ADDRESS, L2_REVERSE_REGISTRAR_ADDRESS],
    log: true,
  });
};
export default func;
func.tags = ['L1ReverseResolver'];
