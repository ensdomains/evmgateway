import hre from 'hardhat';
const ethers = hre.ethers;
const abi = [
  "function predictAddress(address) view returns (address)"
]

export const main = async () => {
  const [signer] = await hre.ethers.getSigners();
  if (!process.env.L2_RESOLVER_FACTORY_ADDRESS || !process.env.L1_PROVIDER_URL || !process.env.L2_PROVIDER_URL || !process.env.ENS_NAME)
    throw 'Set L1_PROVIDER_URL, L2_PROVIDER_URL, L2_RESOLVER_FACTORY_ADDRESS, and ENS_NAME';

  const L2_RESOLVER_FACTORY_ADDRESS = process.env.L2_RESOLVER_FACTORY_ADDRESS
  const L1_PROVIDER_URL = process.env.L1_PROVIDER_URL;
  const L2_PROVIDER_URL = process.env.L2_PROVIDER_URL;
  const ENS_NAME        = process.env.ENS_NAME;
  const ETH_ADDRESS     = signer.address
  const node = ethers.namehash(ENS_NAME)
  console.log({L1_PROVIDER_URL, L2_PROVIDER_URL, L2_RESOLVER_FACTORY_ADDRESS, ENS_NAME, node, ETH_ADDRESS})
  const l2Factory      = (await ethers.getContractFactory('DelegatableResolverFactory', signer)).attach(L2_RESOLVER_FACTORY_ADDRESS);
  // Calling predictAddress via the factory above is throwing an error so creating another connection as a workaround.
  const l2provider        = new ethers.JsonRpcProvider(L2_PROVIDER_URL);
  const l2FactoryRead = new ethers.Contract(L2_RESOLVER_FACTORY_ADDRESS, abi, l2provider);
  const l2resolverAddress = await l2FactoryRead.predictAddress(ETH_ADDRESS)
  const tx1  = await l2Factory.create(ETH_ADDRESS)
  console.log(`4, Creating l2 resolver ${l2resolverAddress} as a target`, (await tx1.wait()).hash)
  const l2Resolver = (await ethers.getContractFactory('DelegatableResolver', signer)).attach(l2resolverAddress);
  const tx2 = await l2Resolver['setAddr(bytes32,address)'](node, ETH_ADDRESS);
  console.log({node, ETH_ADDRESS, a:l2Resolver.interface.fragments})
  console.log(`5, Setting l2 ETH address of ${ENS_NAME} to ${ETH_ADDRESS} as a target`, (await tx2.wait()).hash)
  console.log(6, await l2Resolver['addr(bytes32)'](node))
};

main();