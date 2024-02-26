import hre from 'hardhat';
import packet from 'dns-packet';
const abi = [
  'function supportsInterface(bytes4) view returns(bool)',
  'function name(bytes32) view returns(string)',
  'function resolve(bytes,bytes) view returns(bytes)'
];
const defaultabi = ['function name(address) view returns(string)'];
const encodeName = (name) => '0x' + packet.name.encode(name).toString('hex')
const extendedResolverInterface = '0x9061b923'
import {ethers} from 'ethers';
export const main = async () => {
  if (!process.env.REVERSE_NAMESPACE || !process.env.L1_PROVIDER_URL || !process.env.ETH_ADDRESS)
    throw 'Set REVERSE_NAMESPACE, L1_PROVIDER_URL and ETH_ADDRESS';
  const namespace       = process.env.REVERSE_NAMESPACE;
  const L1_PROVIDER_URL = process.env.L1_PROVIDER_URL;
  const L2_PROVIDER_URL = process.env.L2_PROVIDER_URL;
  const L2_REVERSE_REGISTRAR_ADDRESS = process.env.L2_REVERSE_REGISTRAR_ADDRESS
  const DEFAULT_REVERSE_RESOLVER_ADDRESS = process.env.DEFAULT_REVERSE_RESOLVER_ADDRESS
  const ETH_ADDRESS     = process.env.ETH_ADDRESS;
  const provider        = new ethers.JsonRpcProvider(L1_PROVIDER_URL);
  const l2provider        = new ethers.JsonRpcProvider(L2_PROVIDER_URL);
  const name            = ETH_ADDRESS.substring(2).toLowerCase() + "." + namespace
  const encodedname     = encodeName(name)
  const reversenode     = ethers.namehash(name)
  
  console.log({namespace, ETH_ADDRESS, name, encodedname,reversenode})
  const reverseresolver = await provider.getResolver(namespace);
  console.log({L2_PROVIDER_URL, L2_REVERSE_REGISTRAR_ADDRESS})
  if (L2_PROVIDER_URL && L2_REVERSE_REGISTRAR_ADDRESS){
    const l2resolver = new ethers.Contract(L2_REVERSE_REGISTRAR_ADDRESS, abi, l2provider);
    console.log(`l2: Reverse node for ${name} is set to `, await l2resolver.name(reversenode))
  }
  if(DEFAULT_REVERSE_RESOLVER_ADDRESS){
    const defaultResolver = new ethers.Contract(DEFAULT_REVERSE_RESOLVER_ADDRESS, defaultabi, provider);
  }
  const l1resolver = new ethers.Contract(reverseresolver.address, abi, provider);
  if(await l1resolver.supportsInterface(extendedResolverInterface)){
    const i = new ethers.Interface(abi)
    const calldata = i.encodeFunctionData("name", [reversenode])
    const result = await l1resolver.resolve(encodedname, calldata, { enableCcipRead: true })
    console.log(`l1: Reverse node for ${name} is set to `, ethers.toUtf8String(result))  
  }else {
    const result = await l1resolver.name(reversenode, { enableCcipRead: true })
    console.log(`l1: Reverse node for ${name} is set to `, result)  
  }
};

main();