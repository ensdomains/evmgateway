import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  console.log({deployer})
  const impl = await deploy('Dm3NameRegistrar', {
    from: deployer,
    args: [],
    log: true,
  });
  const implAddress  = impl.address  
  console.log(`Dm3NameRegistrar is deployed at ${implAddress}`)

};
export default func;
func.tags = ['Dm3NameRegistrar'];
