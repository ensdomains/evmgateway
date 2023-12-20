import hre from 'hardhat';
const ethers = hre.ethers;
import packet from 'dns-packet';
const encodeName = (name) => '0x' + packet.name.encode(name).toString('hex')

const abi = [
  "function register(bytes,address)"
]

export const main = async () => {
  if (!process.env.DELEGATABLE_RESOLVER_REGISTRAR || !process.env.ENS_SUBNAME || !process.env.ETH_ADDRESS || !process.env.L2_PROVIDER_URL)
    throw 'Set DELEGATABLE_RESOLVER_REGISTRAR, L2_PROVIDER_URL, ETH_ADDRESS, and ENS_SUBNAME';

  const DELEGATABLE_RESOLVER_REGISTRAR = process.env.DELEGATABLE_RESOLVER_REGISTRAR
  const L2_PROVIDER_URL = process.env.L2_PROVIDER_URL;
  const ENS_SUBNAME = process.env.ENS_SUBNAME;
  const encodedName = encodeName(ENS_SUBNAME)
  const ETH_ADDRESS = process.env.ETH_ADDRESS;
  const node = ethers.namehash(ENS_SUBNAME)
  console.log({L2_PROVIDER_URL, DELEGATABLE_RESOLVER_REGISTRAR, ENS_SUBNAME,encodedName, node, ETH_ADDRESS})
  const l2provider = new ethers.JsonRpcProvider(L2_PROVIDER_URL);
  const registrar = new ethers.Contract(DELEGATABLE_RESOLVER_REGISTRAR, abi, l2provider);
  console.log([encodedName,ETH_ADDRESS].join(','))
  const tx2 = await registrar['register'](encodedName,ETH_ADDRESS);
  console.log(`${ENS_SUBNAME} was registered to ${ETH_ADDRESS}, tx`, (await tx2.wait()).hash)
};

main();