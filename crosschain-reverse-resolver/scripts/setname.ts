import hre from 'hardhat';
const ethers = hre.ethers;

export const main = async () => {
  const [signer] = await hre.ethers.getSigners();
  if (!process.env.L2_PROVIDER_URL || !process.env.L2_REVERSE_REGISTRAR_ADDRESS  || !process.env.ENS_NAME)
    throw 'Set L2_PROVIDER_URL, L2_REVERSE_REGISTRAR_ADDRESS, and ENS_NAME';

  const L2_PROVIDER_URL = process.env.L2_PROVIDER_URL;
  const L2_REVERSE_REGISTRAR_ADDRESS = process.env.L2_REVERSE_REGISTRAR_ADDRESS;
  const ENS_NAME        = process.env.ENS_NAME;
  const ETH_ADDRESS     = signer.address
  const namespace       = 'op.reverse.evmgateway.eth'
  const name            = ETH_ADDRESS.substring(2).toLowerCase() + "." + namespace
  const reversenode     = ethers.namehash(name)

  const L2ReverseRegistrarFactory = (await hre.ethers.getContractFactory("L2ReverseRegistrar")) as L2ReverseRegistrarFactory__factory;
  const l2ReverseRegistrar = L2ReverseRegistrarFactory
                                .connect(signer)
                                .attach(L2_REVERSE_REGISTRAR_ADDRESS);

  console.log({ L2_REVERSE_REGISTRAR_ADDRESS, L2_PROVIDER_URL,ENS_NAME, ETH_ADDRESS, namespace, name, reversenode})
  const tx = await l2ReverseRegistrar.setName(ENS_NAME, {
    gasPrice: "900000",
    gasLimit: 500000,
  });
  const rec = await tx.wait();
  console.log({txhash:rec.hash});
  console.log(await l2ReverseRegistrar.name(reversenode, {enableCcipRead:true}))
};

main();