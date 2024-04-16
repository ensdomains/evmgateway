import hre from 'hardhat';

const ethers = hre.ethers;
export const main = async () => {
  const [signer] = await hre.ethers.getSigners();
  if (!process.env.DEPLOYER_PRIVATE_KEY)
  throw 'Set DEPLOYER_PRIVATE_KEY';
  if (!process.env.REVERSE_NAMESPACE)
    throw 'Set REVERSE_NAMESPACE';
  if (!process.env.L1_PROVIDER_URL)
    throw 'Set L1_PROVIDER_URL';
  if (!process.env.DEFAULT_REVERSE_RESOLVER_ADDRESS)
    throw 'Set DEFAULT_REVERSE_RESOLVER_ADDRESS';
  if (!process.env.DEFAULT_ENS_NAME)
    throw 'Set DEFAULT_ENS_NAME';
  const L1_PROVIDER_URL = process.env.L1_PROVIDER_URL;
  const DEFAULT_REVERSE_RESOLVER_ADDRESS = process.env.DEFAULT_REVERSE_RESOLVER_ADDRESS;
  const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
  const namespace       = process.env.REVERSE_NAMESPACE;
  const DEFAULT_ENS_NAME        = process.env.DEFAULT_ENS_NAME;
  const DefaultReverseResolverFactory = (await hre.ethers.getContractFactory("DefaultReverseResolver")) as DefaultReverseResolverFactory__factory;
  const DefaultReverseResolver = DefaultReverseResolverFactory
                                .connect(signer)
                                .attach(DEFAULT_REVERSE_RESOLVER_ADDRESS);
  const testSigner = new ethers.Wallet(DEPLOYER_PRIVATE_KEY); 
  const ETH_ADDRESS = testSigner.address
  const name            = ETH_ADDRESS.substring(2).toLowerCase() + "." + namespace
  const reversenode     = ethers.namehash(name)
  console.log({ DEFAULT_REVERSE_RESOLVER_ADDRESS, L1_PROVIDER_URL,DEFAULT_ENS_NAME, ETH_ADDRESS, namespace, name, reversenode})

  const funcId = ethers
    .id('setNameForAddrWithSignature(address,string,uint256,bytes)')
    .substring(0, 10)
  const block = await ethers.provider.getBlock("latest")
  const inceptionDate = block?.timestamp
  const message =  ethers.solidityPackedKeccak256(
    ['bytes32', 'address', 'uint256', 'uint256'],
    [ethers.solidityPackedKeccak256(['bytes4', 'string'], [funcId, DEFAULT_ENS_NAME]), ETH_ADDRESS, inceptionDate, 0],
  )
  const signature = await testSigner.signMessage(ethers.toBeArray(message))    
  console.log({
    ETH_ADDRESS,
    DEFAULT_ENS_NAME,
    inceptionDate,
    signature
  })

  const tx = await DefaultReverseResolver['setNameForAddrWithSignature'](
    ETH_ADDRESS,
    DEFAULT_ENS_NAME,
    inceptionDate,
    signature,
  )

  const rec = await tx.wait();
  console.log({txhash:rec.hash});
  console.log(await DefaultReverseResolver.name(ETH_ADDRESS))
};

main();