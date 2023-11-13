# @ensdomains/crosschain-reverse-resolver

A reverse resolver contract that is built on top of evm-verifier.

For a detailed readme and usage instructions, see the [monorepo readme](https://github.com/ensdomains/evmgateway/tree/main).


## Deploying (Goerli)

Create `.env` and set the following variables

- DEPLOYER_PRIVATE_KEY
- L1_PROVIDER_URL
- L2_PROVIDER_URL
- L1_ETHERSCAN_API_KEY
- L2_ETHERSCAN_API_KEY
- VERIFIER_ADDRESS
- REVERSE_NAMESPACE

```
bun run hardhat deploy --network optimismGoerli
```

Followed by the L1 contract:

```
bun run hardhat deploy --network goerli
```

After deployment is complete, set the rersolver of $REVERSE_NAMESPACE to L1ReverseResolver contract address

## Deployments

### OP
#### L2
- L2ReverseRegistrar = [0x7D006EFd21eb282C8B0a425BAB546517bfEC2cc2](https://goerli-optimism.etherscan.io/address/0x7D006EFd21eb282C8B0a425BAB546517bfEC2cc2) 
#### L1
- L1ReverseResolver = [0xeEB5832Ea8732f7EF06d468E40F562c9D7347795](https://goerli.etherscan.io/address/0xeEB5832Ea8732f7EF06d468E40F562c9D7347795) = Currently `op.reverse.evmgateway.eth` is set to the resolver

## Usage

### Set Primary name on L2

```
const name = 'foo.op.evmgateway.eth'
const registrar = registrar.setName(name)
```

, try it directly from [etherscan](https://goerli.etherscan.io/address/0xeEB5832Ea8732f7EF06d468E40F562c9D7347795), or run the script
```
L2_PROVIDER_URL=$L2_PROVIDER_URL L2_REVERSE_REGISTRAR_ADDRESS=$L2_REVERSE_REGISTRAR_ADDRESS ENS_NAME='foo.op.evmgateway.eth' yarn setname
```

### Query Primary name on L1


The current goerli primary namespace is set at `op.reverse.evmgateway.eth` for Optimism Goerli. Once the ENS DAO approves it, it will be put under `${cointype}.ververse`

- 2147484068 is the coin type of Optimism Goerli (420)
- 2147568179 is the coin type of Base Goerli (84531)

```js
import packet from 'dns-packet';
import {ethers} from 'ethers';
const abi = ['function name(bytes32) view returns(string)'];
const encodeName = (name) => '0x' + packet.name.encode(name).toString('hex')
const namespace       = 'op.reverse.evmgateway.eth' // 2147484068. is the coinType of Optimism Goerli (420)
const name            = ETH_ADDRESS.substring(2).toLowerCase() + "." + namespace
const encodedname     = encodeName(name);
const reversenode     = ethers.namehash(name);
const reverseresolver = await provider.getResolver(namespace);
const provider        = new ethers.JsonRpcProvider(L1_PROVIDER_URL);
const l1resolver = new ethers.Contract(reverseresolver.address, abi, provider);
console.log(await l1resolver.name(reversenode, {enableCcipRead:true}))
```

or run the script

```
L1_PROVIDER_URL=$L1_PROVIDER_URL L2_REVERSE_REGISTRAR_ADDRESS=$L2_REVERSE_REGISTRAR_ADDRESS ETH_ADDRESS=$ETH_ADDRESS yarn getname
```
