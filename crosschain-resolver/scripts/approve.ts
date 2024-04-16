import hre from 'hardhat';
import packet from 'dns-packet';
const ethers = hre.ethers;
const encodeName = (name) => '0x' + packet.name.encode(name).toString('hex')
const abi = [
  "function predictAddress(address) view returns (address)"
]

export const main = async () => {
  const [signer] = await hre.ethers.getSigners();
  if (!process.env.OPERATOR_ADDRESS || !process.env.L2_RESOLVER_FACTORY_ADDRESS || !process.env.L1_PROVIDER_URL || !process.env.L2_PROVIDER_URL || !process.env.ENS_SUBNAME)
    throw 'Set OPERATOR_ADDRESS L1_PROVIDER_URL, L2_PROVIDER_URL, L2_RESOLVER_FACTORY_ADDRESS, and ENS_SUBNAME';

  const OPERATOR_ADDRESS = process.env.OPERATOR_ADDRESS
  const L2_RESOLVER_FACTORY_ADDRESS = process.env.L2_RESOLVER_FACTORY_ADDRESS
  const L1_PROVIDER_URL             = process.env.L1_PROVIDER_URL;
  const L2_PROVIDER_URL             = process.env.L2_PROVIDER_URL;
  const ENS_SUBNAME                 = process.env.ENS_SUBNAME;
  const ETH_ADDRESS                 = signer.address;
  const node = ethers.namehash(ENS_SUBNAME)
  const encodedName = encodeName(ENS_SUBNAME)
  console.log({L1_PROVIDER_URL, L2_PROVIDER_URL, L2_RESOLVER_FACTORY_ADDRESS, OPERATOR_ADDRESS, ENS_SUBNAME, encodedName,node})
  const l2provider        = new ethers.JsonRpcProvider(L2_PROVIDER_URL);
  const l2FactoryRead = new ethers.Contract(L2_RESOLVER_FACTORY_ADDRESS, abi, l2provider);
  const l2resolverAddress = await l2FactoryRead.predictAddress(ETH_ADDRESS)
  console.log(`l2 resolver address for ${ETH_ADDRESS} is ${l2resolverAddress}`)
  const l2Resolver   = (await ethers.getContractFactory('DelegatableResolver', signer)).attach(l2resolverAddress);
  const tx2 = await l2Resolver.approve(encodedName, OPERATOR_ADDRESS, true);
  console.log(`Approving ${OPERATOR_ADDRESS} to update ${ENS_SUBNAME}`, (await tx2.wait()).hash)
};

main();