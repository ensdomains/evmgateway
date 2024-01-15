# @ensdomains/crosschain-reverse-resolver

A reverse resolver contract that is built on top of evm-verifier.

For a detailed readme and usage instructions, see the [monorepo readme](https://github.com/ensdomains/evmgateway/tree/main).


## Deploying (Goerli)

## Deploying (Sepolia)

Before deploying l1 contracts, deploy l2 contracts on https://github.com/ensdomains/ens-contracts

```
git clone https://github.com/ensdomains/ens-contracts
cd ens-contracts
DEPLOYER_KEY=$DEPLOYER_KEY ETHERSCAN_API_KEY=$ETHERSCAN_API_KEY npx hardhat deploy --tags l2 --network optimismSepolia/baseSepolia/arbSepolia
```

Once l2 contracts are deployed, create `.env` and set the following variables

Create `.env` and set the following variables

- DEPLOYER_PRIVATE_KEY
- L1_PROVIDER_URL
- L2_PROVIDER_URL
- L1_ETHERSCAN_API_KEY
- L2_ETHERSCAN_API_KEY
- VERIFIER_ADDRESS
- REVERSE_NAMESPACE
- L2_REVERSE_REGISTRAR_ADDRESS
- CHAIN_NAME (Op/Base/Arb)
```
bun run hardhat deploy --network sepolia
```

After deployment is complete, set the rersolver of $REVERSE_NAMESPACE to L1ReverseResolver contract address

## Deployments

### OP
#### L2
- L2ReverseRegistrar = [0xc40cdB59896D02a500D892A5bdA1CDf54a392A1d](https://sepolia-optimism.etherscan.io/address/0xc40cdB59896D02a500D892A5bdA1CDf54a392A1d#code
) = REVERSE_NAMESPACE is set to `2158639068.reverse.evmgateway.eth`
#### L1
- L1ReverseResolver = [0x2D6e4FDbC2CF9422CEa8fA79c4b6AC517D32cd18](https://sepolia.etherscan.io/address/0x2D6e4FDbC2CF9422CEa8fA79c4b6AC517D32cd18#code)

### Base

#### L2
- L2ReverseRegistrar = [0x4166B7e70F14C48980Da362256D1Da9Cc8F95e13](https://sepolia.basescan.org/address/0x4166B7e70F14C48980Da362256D1Da9Cc8F95e13#code) = REVERSE_NAMESPACE is set to `2147568180.reverse.evmgateway.eth`
#### L1
- L1ReverseResolver = [0x3d6BBfDCe5C484D9177F3a7d30e3bfe7Add5051E](https://sepolia.etherscan.io/address/0x3d6BBfDCe5C484D9177F3a7d30e3bfe7Add5051E#code)

### Arbitrum

#### L2
- L2ReverseRegistrar = [0x7bB1207A7C23d620Cb22C2DcC96424CCb92272ae](https://api-sepolia.arbiscan.io/address/0x7bB1207A7C23d620Cb22C2DcC96424CCb92272ae#code
) = REVERSE_NAMESPACE is set to `2147905262.reverse.evmgateway.eth`
#### L1
- L1ReverseResolver = [0xDC317ef697b3A9903a24abcC325d9C1C80B19D87](https://sepolia.etherscan.io/address/0xDC317ef697b3A9903a24abcC325d9C1C80B19D87#code)

## Usage

### Set Primary name on L2

```
const name = 'foo.op.evmgateway.eth'
const registrar = registrar.setName(name)
```

, try it directly from [etherscan](https://goerli.etherscan.io/address/0xeEB5832Ea8732f7EF06d468E40F562c9D7347795), or run the script
```
DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY REVERSE_NAMESPACE=$REVERSE_NAMESPACE L2_PROVIDER_URL=$L2_PROVIDER_URL L2_REVERSE_REGISTRAR_ADDRESS=$L2_REVERSE_REGISTRAR_ADDRESS ENS_NAME=$ENS_NAME yarn setname --network optimismSepolia
```

### Query Primary name on L1

The current goerli primary namespace is set at `{cointype}.reverse.evmgateway.eth` for Optimism Goerli. Once the ENS DAO approves it, it will be put under `${cointype}.reverse`

- 2158639068 is the coin type of Optimism Sepolia (11155420)
- 2147568180 is the coin type of Base Sepolia (84532)
- 2147905262 is the coin type of Arbitrum Sepolia (421614)

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

Using the script

```
L1_PROVIDER_URL=$L1_PROVIDER_URL REVERSE_NAMESPACE=$REVERSE_NAMESPACE L2_REVERSE_REGISTRAR_ADDRESS=$L2_REVERSE_REGISTRAR_ADDRESS ETH_ADDRESS=$ETH_ADDRESS yarn getname
```
