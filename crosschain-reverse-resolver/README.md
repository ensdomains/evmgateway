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

### L1

- DefaultReverseResolver = [0xfD2c2598382D8876BcC70f550B22d7F70Dda30b0](https://sepolia.etherscan.io/address/0xfD2c2598382D8876BcC70f550B22d7F70Dda30b0#code
)

### OP
#### L2
- L2ReverseRegistrar = [0x83C058D2139a6eFA32E42BeB415409000C075563](https://sepolia-optimism.etherscan.io/address/0x83C058D2139a6eFA32E42BeB415409000C075563#code
) = REVERSE_NAMESPACE is set to `2158639068.reverse`
#### L1
- L1ReverseResolver = [0xF7e3a2861FfA833C39544B7bbE9D94f3219E5b70](https://sepolia.etherscan.io/address/0xF7e3a2861FfA833C39544B7bbE9D94f3219E5b70#code)

### Base

#### L2
- L2ReverseRegistrar = [0x913CC39C2A6aa4A1531429C079bA5f8DcF6a2FC2](https://sepolia.basescan.org/address/0x913CC39C2A6aa4A1531429C079bA5f8DcF6a2FC2#code) = REVERSE_NAMESPACE is set to `2147568180.reverse`
#### L1
- L1ReverseResolver = [0x302096e94FC120A21053f7563e2Ed554d523ba41](https://sepolia.etherscan.io/address/0x302096e94FC120A21053f7563e2Ed554d523ba41#code
)

### Arbitrum

#### L2
- L2ReverseRegistrar = [0x60a384Cfbb088Aa8c1750A04548b1b983CDc0418](https://sepolia.arbiscan.io/address/0x60a384Cfbb088Aa8c1750A04548b1b983CDc0418#code
) = REVERSE_NAMESPACE is set to `2147905262.reverse`
#### L1
- L1ReverseResolver = [0x935510B4270F69c6fa4Fadab75B4EA0A1Fb68349]https://sepolia.etherscan.io/address/0x935510B4270F69c6fa4Fadab75B4EA0A1Fb68349#code)


## Usage

### Set Default Primary name on L1

```
const testSigner = new ethers.Wallet(PRIVATE_KEY); 
const testAddress = testSigner.address
const name = 'myname.eth'
const reverseLabel = testAddress.substring(2).toLowerCase()
const l2ReverseName = `${reverseLabel}.${NAMESPACE}.reverse`
const l2ReverseNode = ethers.namehash(l2ReverseName)
const encodedL2ReverseName = encodeName(l2ReverseName)

const defaultReverseName = `${reverseLabel}.default.reverse`
const defaultReverseNode = ethers.namehash(defaultReverseName)
const encodedDefaultReverseName = encodeName(defaultReverseName)

const funcId = ethers
    .id('setNameForAddrWithSignature(address,string,uint256,bytes)')
    .substring(0, 10)

const block = await provider.getBlock('latest')
const inceptionDate = block?.timestamp
const message =  ethers.solidityPackedKeccak256(
    ['bytes32', 'address', 'uint256', 'uint256'],
    [ethers.solidityPackedKeccak256(['bytes4', 'string'], [funcId, name]), testAddress, inceptionDate, 0],
)
const signature = await testSigner.signMessage(ethers.toBeArray(message))    
await defaultReverseResolver.setNameForAddrWithSignature(
    testAddress,
    name,
    inceptionDate,
    signature,
)
```

or run the script
```
DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY REVERSE_NAMESPACE=$REVERSE_NAMESPACE L1_PROVIDER_URL=$L1_PROVIDER_URL DEFAULT_REVERSE_RESOLVER_ADDRESS=$DEFAULT_REVERSE_RESOLVER_ADDRESS DEFAULT_ENS_NAME=$DEFAULT_ENS_NAME yarn setdefaultname
```


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
