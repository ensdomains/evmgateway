import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const OPVerifier = await deployments.get('OPVerifier');
  const TestL2 = await hre.companionNetworks['l2'].deployments.get('TestL2');
  console.log([OPVerifier.address, TestL2.address])
  await deploy('TestL1', {
    from: deployer,
    args: [OPVerifier.address, TestL2.address],
    log: true,
  });
};
export default func;
func.tags = ['TestL1'];
