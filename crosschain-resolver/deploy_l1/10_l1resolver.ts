import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {convertEVMChainIdToCoinType} from '@ensdomains/address-encoder'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const VERIFIER_ADDRESS = process.env.VERIFIER_ADDRESS
  const ENS_ADDRESS = process.env.ENS_ADDRESS
  const WRAPPER_ADDRESS = process.env.WRAPPER_ADDRESS
  const L2_GRAPHQL_URL = process.env.L2_GRAPHQL_URL
  const L2_CHAIN_ID = process.env.L2_CHAIN_ID
  
  if(!VERIFIER_ADDRESS) throw ('Set $VERIFIER_ADDRESS')
  if(!ENS_ADDRESS) throw ('Set $ENS_ADDRESS')
  if(!WRAPPER_ADDRESS) throw ('Set $WRAPPER_ADDRESS')
  if(!L2_GRAPHQL_URL) throw ('Set $L2_GRAPHQL_URL')
  if(!L2_CHAIN_ID) throw ('Set $L2_CHAIN_ID')
  const CHAIN_NAME = process.env.CHAIN_NAME

  if(!['Op', 'Base', 'Arb'].includes(CHAIN_NAME)) throw ('Set $CHAIN_NAME to Op, Base, or Arb')
  console.log({VERIFIER_ADDRESS,ENS_ADDRESS, WRAPPER_ADDRESS,L2_GRAPHQL_URL,L2_CHAIN_ID})
  await deploy(`${CHAIN_NAME}L1Resolver`, {
    from: deployer,
    contract: 'L1Resolver',
    args: [VERIFIER_ADDRESS,ENS_ADDRESS,WRAPPER_ADDRESS,L2_GRAPHQL_URL,parseInt(L2_CHAIN_ID)],
    log: true,
  });
};
export default func;
func.tags = ['L1Resolver'];
