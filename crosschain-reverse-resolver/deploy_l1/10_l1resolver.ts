import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const DefaultReverseResolver = await deployments.get('DefaultReverseResolver');
  const DEFAULT_REVERSE_RESOLVER_ADDRESS = DefaultReverseResolver.address
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const VERIFIER_ADDRESS = process.env.VERIFIER_ADDRESS
  const L2_REVERSE_REGISTRAR_ADDRESS = process.env.L2_REVERSE_REGISTRAR_ADDRESS
  const CHAIN_NAME = process.env.CHAIN_NAME
  if(!VERIFIER_ADDRESS) throw ('Set $VERIFIER_ADDRESS')
  if(!['Op', 'Base', 'Arb'].includes(CHAIN_NAME)) throw ('Set $CHAIN_NAME to Op, Base, or Arb')
  if(!L2_REVERSE_REGISTRAR_ADDRESS) throw ('Set $L2_REVERSE_REGISTRAR_ADDRESS')
  console.log({VERIFIER_ADDRESS, L2_REVERSE_REGISTRAR_ADDRESS, DEFAULT_REVERSE_RESOLVER_ADDRESS})
  await deploy(`${CHAIN_NAME}L1ReverseResolver`, {
    from: deployer,
    contract:'L1ReverseResolver',
    args: [VERIFIER_ADDRESS, L2_REVERSE_REGISTRAR_ADDRESS, DEFAULT_REVERSE_RESOLVER_ADDRESS],
    log: true,
  });
};
export default func;
func.dependencies = [
  'DefaultReverseResolver',
]
func.tags = ['L1ReverseResolver'];
