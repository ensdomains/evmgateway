import hre from 'hardhat';
const ethers = hre.ethers;
const abi = [
  "function predictAddress(address) view returns (address)"
]

export const main = async () => {
  const [signer] = await hre.ethers.getSigners();
  if (!process.env.L2_RESOLVER_FACTORY_ADDRESS || !process.env.L2_PROVIDER_URL || !process.env.ENS_NAME)
    throw 'Set L2_PROVIDER_URL, L2_RESOLVER_FACTORY_ADDRESS, and ENS_NAME';

  const L2_RESOLVER_FACTORY_ADDRESS = process.env.L2_RESOLVER_FACTORY_ADDRESS
  const L2_PROVIDER_URL = process.env.L2_PROVIDER_URL;
  const ENS_NAME        = process.env.ENS_NAME;
  const ETH_ADDRESS     = signer.address
  const node = ethers.namehash(ENS_NAME)
  console.log({L2_PROVIDER_URL, L2_RESOLVER_FACTORY_ADDRESS, ENS_NAME, node, ETH_ADDRESS})
  // Calling predictAddress via the factory above is throwing an error so creating another connection as a workaround.
  const l2provider        = new ethers.JsonRpcProvider(L2_PROVIDER_URL);
  const l2FactoryRead = new ethers.Contract(L2_RESOLVER_FACTORY_ADDRESS, abi, l2provider);
  const l2resolverAddress = await l2FactoryRead.predictAddress(ETH_ADDRESS)
  const l2Resolver       = (await ethers.getContractFactory('DelegatableResolver', signer)).attach(l2resolverAddress);
  const tx1 = await l2Resolver['setAddr(bytes32,address)'](node, ETH_ADDRESS, {
  });
  console.log(`Setting l2 ETH address of ${ENS_NAME} to ${ETH_ADDRESS}`, (await tx1.wait()).hash)
  const tx2 = await l2Resolver['setAddr(bytes32,uint256,bytes)'](node, 123, ETH_ADDRESS);
  console.log(`Setting l2 coin address of ${ENS_NAME} to ${ETH_ADDRESS}`, (await tx2.wait()).hash)
  const tx3 = await l2Resolver['setContenthash(bytes32,bytes)'](node, ETH_ADDRESS);
  console.log(`Setting l2 contenthah of ${ENS_NAME} to ${ETH_ADDRESS}`, (await tx3.wait()).hash)
  const tx4 = await l2Resolver['setText(bytes32,string,string)'](node, 'hello', 'world');
  console.log(`Setting l2 text of ${ENS_NAME} to hello world`, (await tx4.wait()).hash)
};

main();