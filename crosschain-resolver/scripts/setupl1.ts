import hre from 'hardhat';
import packet from 'dns-packet';
const ethers = hre.ethers;
const abi = [
  "function predictAddress(address) view returns (address)"
]
const encodeName = (name) => '0x' + packet.name.encode(name).toString('hex')

export const main = async () => {
  const [signer] = await hre.ethers.getSigners();

  const L2_RESOLVER_FACTORY_ADDRESS = process.env.L2_RESOLVER_FACTORY_ADDRESS
  const L1_PROVIDER_URL = process.env.L1_PROVIDER_URL;
  const L2_PROVIDER_URL = process.env.L2_PROVIDER_URL;
  const L1_RESOLVER_ADDRESS = process.env.L1_RESOLVER_ADDRESS;
  const ENS_NAME        = process.env.ENS_NAME;
  const ETH_ADDRESS     = signer.address
  const encodedname = encodeName(ENS_NAME);
  console.log({L2_RESOLVER_FACTORY_ADDRESS, L1_RESOLVER_ADDRESS, ENS_NAME, encodedname, ETH_ADDRESS})


  if (!process.env.L2_RESOLVER_FACTORY_ADDRESS || !process.env.L1_PROVIDER_URL || !process.env.L2_PROVIDER_URL || !process.env.ENS_NAME)
    throw 'Set L1_PROVIDER_URL, L2_PROVIDER_URL, L2_RESOLVER_FACTORY_ADDRESS, L1_RESOLVER_ADDRESS, and ENS_NAME';

  const provider        = new ethers.JsonRpcProvider(L1_PROVIDER_URL);
  const currentResolver = await provider.getResolver(ENS_NAME)
  if(currentResolver.address !== L1_RESOLVER_ADDRESS){
    console.log({ENS_NAME, CURRENT_RESOLVER_ADDRESS:currentResolver.address, L1_RESOLVER_ADDRESS})
    throw(`Set the resolver of the parent name to ${L1_RESOLVER_ADDRESS}`)
  }else{
    console.log(`The resolver of ${ENS_NAME} is set to ${L1_RESOLVER_ADDRESS}`)
  }

  const l2provider        = new ethers.JsonRpcProvider(L2_PROVIDER_URL);
  const l2Factory = new ethers.Contract(L2_RESOLVER_FACTORY_ADDRESS, abi, l2provider);
  console.log({l2Factory})
  const l2resolverAddress = await l2Factory.predictAddress(ETH_ADDRESS)
  console.log({l2resolverAddress})    
  const l1resolver      = (await ethers.getContractFactory('L1Resolver', signer)).attach(L1_RESOLVER_ADDRESS);
  const tx2             = await l1resolver.setTarget(encodedname, l2resolverAddress)
  
  console.log(`Setting l2 resolver ${l2resolverAddress} as a target`, (await tx2.wait()).hash)
  console.log(`Set export L2_RESOLVER_ADDRESS=${l2resolverAddress}`)
};

main();