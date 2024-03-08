import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const OP_VERIFIER_ADDRESS = process.env.OP_VERIFIER_ADDRESS
  if(!OP_VERIFIER_ADDRESS) throw ('Set $OP_VERIFIER_ADDRESS')
  console.log({OP_VERIFIER_ADDRESS})
  await deploy('Dm3NameRegistrarEVMFetcher', {
    from: deployer,
    args: [OP_VERIFIER_ADDRESS],
    log: true,
  });
};
export default func;
func.tags = ['Dm3NameRegistrarEVMFetcher'];
