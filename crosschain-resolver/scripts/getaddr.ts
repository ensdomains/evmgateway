import packet from 'dns-packet';
const encodeName = (name) => '0x' + packet.name.encode(name).toString('hex')
const l1abi = [
  "function getTarget(bytes) view returns (bytes32, address)",
  "function addr(bytes32) view returns (address)",
  "function resolve(bytes,bytes) view returns (bytes)",
]

const l2abi = [
  "function addr(bytes32) view returns (address)"
]

import {ethers} from 'ethers';
export const main = async () => {
  if (!process.env.L1_PROVIDER_URL || !process.env.ENS_NAME)
    throw 'Set L1_PROVIDER_URL and ENS_NAME';

  const L1_PROVIDER_URL = process.env.L1_PROVIDER_URL;
  const L2_PROVIDER_URL = process.env.L2_PROVIDER_URL;
  const ENS_NAME        = process.env.ENS_NAME;
  const encodedname     = encodeName(ENS_NAME)
  const node            = ethers.namehash(ENS_NAME)

  const l1provider      = new ethers.JsonRpcProvider(L1_PROVIDER_URL);
  const l2provider      = new ethers.JsonRpcProvider(L2_PROVIDER_URL);
  let resolver          = await l1provider.getResolver(ENS_NAME)
  // Wildcard seems not working. A workaround for now
  if(!resolver){
    const parentName    = ENS_NAME.split('.').slice(1).join('.')
    console.log(`Resolver not found on ${ENS_NAME}. Looking up ${parentName}`)
    resolver            = await l1provider.getResolver(parentName)
  }
  console.log({ENS_NAME, resolver, encodedname, node})
  const l1resolver      = new ethers.Contract(resolver.address, l1abi, l1provider);
  const target          = await l1resolver.getTarget(encodedname)
  const l2resolverAddress = target[1]
  console.log('Target is set to ' + l2resolverAddress);
  const l2resolver        = new ethers.Contract(l2resolverAddress, l2abi, l2provider);
  const l2address         = await l2resolver['addr(bytes32)'](node)
  console.log('L2 query result ' + l2address);
  const i = new ethers.Interface(l1abi)
  const calldata = i.encodeFunctionData("addr", [node])
  const result2 = await l1resolver.resolve(encodedname, calldata, { enableCcipRead: true })
  const decoded = i.decodeFunctionResult("addr", result2)
  console.log('L1 query result ' + decoded[0]);
  // These should also work but somehow not working. Mabye some inconsistent resolver interface?
  console.log(await l1provider.resolveName(ENS_NAME));
  console.log(await resolver.getAddress());
};

main();