import hre from 'hardhat';
import packet from 'dns-packet';
const abi = ['function name(bytes32) view returns(string)'];
const encodeName = (name) => '0x' + packet.name.encode(name).toString('hex')
import {ethers} from 'ethers';
export const main = async () => {
  if (!process.env.L1_PROVIDER_URL || !process.env.ETH_ADDRESS)
    throw 'Set L1_PROVIDER_URL and ETH_ADDRESS';

  const namespace = 'op.reverse.evmgateway.eth'
  const L1_PROVIDER_URL = process.env.L1_PROVIDER_URL;
  const ETH_ADDRESS     = process.env.ETH_ADDRESS;
  const provider        = new ethers.JsonRpcProvider(L1_PROVIDER_URL);
  const name            = ETH_ADDRESS.substring(2).toLowerCase() + "." + namespace
  const encodedname     = encodeName(name)
  const reversenode     = ethers.namehash(name)
  
  console.log({ETH_ADDRESS, name, encodedname,reversenode})
  const reverseresolver = await provider.getResolver(namespace);
  const l1resolver = new ethers.Contract(reverseresolver.address, abi, provider);
  console.log(await l1resolver.name(reversenode, {enableCcipRead:true}))
};

main();