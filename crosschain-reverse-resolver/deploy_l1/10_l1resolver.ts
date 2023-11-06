import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const OP_VERIFIER_ADDRESS = process.env.OP_VERIFIER_ADDRESS
  const L2ReverseRegistrar = await hre.companionNetworks['l2'].deployments.get('L2ReverseRegistrar');
  if(!OP_VERIFIER_ADDRESS) throw ('Set $OP_VERIFIER_ADDRESS')
  console.log({OP_VERIFIER_ADDRESS, L2_RESOLVER_ADDRESS:L2ReverseRegistrar.address})
  await deploy('L1ReverseResolver', {
    from: deployer,
    args: [OP_VERIFIER_ADDRESS, L2ReverseRegistrar.address],
    log: true,
  });
};
export default func;
func.tags = ['L1ReverseResolver'];
