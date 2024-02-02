# @ensdomains/crosschain-reverse-resolver

A reverse resolver contract that is built on top of evm-verifier.

For a detailed readme and usage instructions, see the [monorepo readme](https://github.com/ensdomains/evmgateway/tree/main).


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
- L2ReverseRegistrar = [0xfdF30e5E06d728704A42bac6E0326538E659a67B](https://sepolia-optimism.etherscan.io/address/0xfdF30e5E06d728704A42bac6E0326538E659a67B#code
) = REVERSE_NAMESPACE is set to `2158639068.reverse`
#### L1
- L1ReverseResolver = [0xCCe95773C00b924c9EB60822c970eBA2884Ef6A3](https://sepolia.etherscan.io/address/0xCCe95773C00b924c9EB60822c970eBA2884Ef6A3#code)

### Base

#### L2
- L2ReverseRegistrar = [0xF2c102E96A183fC598d83fDccF4e30cfE83aedCd](https://sepolia.basescan.org/address/0xF2c102E96A183fC598d83fDccF4e30cfE83aedCd#code) = REVERSE_NAMESPACE is set to `2147568180.reverse`
#### L1
- L1ReverseResolver = [0x2B07Cf3ef421A5ff1cb6f437036bdEF132eEA37B](https://sepolia.etherscan.io/address/0x2B07Cf3ef421A5ff1cb6f437036bdEF132eEA37B#code)

### Arbitrum

#### L2
- L2ReverseRegistrar = [0xeC6D530EDc9c783F58Da1aD41C3c5B63C3095720](https://sepolia.arbiscan.io/address/0xeC6D530EDc9c783F58Da1aD41C3c5B63C3095720#code
) = REVERSE_NAMESPACE is set to `2147905262.reverse`
#### L1
- L1ReverseResolver = [0x065cB486e830bc5517D2a4287e0857cd564a476D](https://sepolia.etherscan.io/address/0x065cB486e830bc5517D2a4287e0857cd564a476D#code)

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

All primary names are registered under `${ADDRESS}.${cointype}.reverse` namespace.

- 2158639068 is the coin type of Optimism Sepolia (11155420)
- 2147568180 is the coin type of Base Sepolia (84532)
- 2147905262 is the coin type of Arbitrum Sepolia (421614)

```js
import packet from 'dns-packet';
import {ethers} from 'ethers';
const abi = ['function name(bytes32) view returns(string)'];
const encodeName = (name) => '0x' + packet.name.encode(name).toString('hex')
const namespace       = '2158639068.reverse' // 2158639068 is the coinType of Optimism Sepolia (11155420)
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
