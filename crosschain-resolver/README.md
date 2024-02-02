# @ensdomains/crosschain-resolver

A resolver contract that is built on top of evm-verifier.

For a detailed readme and usage instructions, see the [monorepo readme](https://github.com/ensdomains/evmgateway/tree/main).


## How it is defined

When the resolver has the following storage layout,

```
 contract Resolver {
    // node => version
    mapping(bytes32 => uint64) public recordVersions;
    // versionable_addresses[recordVersions[node]][node][coinType]
    // version => node => cointype
    mapping(uint64 => mapping(bytes32 => mapping(uint256 => bytes))) versionable_addresses;
```

Run `yarn storage` to find out storage slot for each variable

```
// Storage slot
// ┌────────────────────────────┬──────────────────────────────┬──────────────┬
// │      contract              │        state_variable        │ storage_slot │ 
// ├────────────────────────────┼──────────────────────────────┼──────────────┼
// │    DelegatableResolver     │        recordVersions        │      0       │
// │    DelegatableResolver     │       versionable_abis       │      1       │
// │    DelegatableResolver     │    versionable_addresses     │      2       │
```

Then define the l1 function

```
    function addr(
        bytes32 node,
        uint256 coinType
    ) public view returns (bytes memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(0)  // storage_slot of recordVersions
              .element(node)
            .getDynamic(2) // storage_slot of versionable_addresses
              .ref(0)        // Referencing the result of `.getStatic(0)`
              .element(node)
              .element(coinType)
            .fetch(this.addrCoinTypeCallback.selector, ''); // recordVersions
```

Storage verificaton can only verify the data of l2. When the function result needs some transformation, transform inside the callback function as follows.

```
    function addrCallback(
        bytes[] memory values,
        bytes memory
    ) public pure returns (address) {
        return bytesToAddress(values[1]);
    }
```

## Deploying (Sepolia)

Before deploying l1 contracts, deploy l2 contracts on https://github.com/ensdomains/ens-contracts

```
git clone https://github.com/ensdomains/ens-contracts
cd ens-contracts
DEPLOYER_KEY=$DEPLOYER_KEY ETHERSCAN_API_KEY=$ETHERSCAN_API_KEY npx hardhat deploy --tags l2 --network optimismSepolia/baseSepolia/arbSepolia
```

Once l2 contracts are deployed, create `.env` and set the following variables

- DEPLOYER_PRIVATE_KEY
- L1_PROVIDER_URL
- L2_PROVIDER_URL
- L1_ETHERSCAN_API_KEY
- VERIFIER_ADDRESS
- ENS_ADDRESS
- WRAPPER_ADDRESS
- L2_GRAPHQL_URL
```
bun run hardhat deploy --network sepolia
```

## Deployments

NOTE: Each name owner will be deploying a dedicated resolver for the name and their subnames.
You can predict the resolver address by calling the predictAddress

```
DelegatableResolverFactory.predictAddress(ownerAddress)
```

The function is an external function and you cannot call read function from etherscan.
To work around, you may want to define the abi function as view function

```
const abi = [
  "function predictAddress(address) view returns (address)"
]
const l2Factory = new ethers.Contract(L2_RESOLVER_FACTORY_ADDRESS, abi, l2provider);
const l2resolverAddress = await l2Factory.predictAddress(ETH_ADDRESS)
```

### OP on Sepolia

#### L2
- DelegatableResolver = [0x017845E4518dB01EFCAFd7Acb192aF924B432d66](https://sepolia-optimism.etherscan.io/address/0x017845E4518dB01EFCAFd7Acb192aF924B432d66#code
) = this is used as a template so cannot interact directly
- DelegatableResolverFactory = [0x79b784075600c5C420aC3CEd45f04EEA50306a96](https://sepolia-optimism.etherscan.io/address/0x79b784075600c5C420aC3CEd45f04EEA50306a96#code)

#### L1
- OPVerifier = [0x0e8DA38565915B7e74e2d78F80ba1BF815F34116](https://sepolia.etherscan.io/address/0x0e8DA38565915B7e74e2d78F80ba1BF815F34116#code)
- L1Resolver = [0x57C1f50093C1017AE81EBAF336511ACcc48061e2](https://sepolia.etherscan.io/address/0x57C1f50093C1017AE81EBAF336511ACcc48061e2#code) = Currently `op.evmgateway.eth` is set to the resolver

### Base on Sepolia

#### L2
- DelegatableResolver = [0xd8A6B88b0a0B419fCce6cfBD60F21f1b7761eeB2](https://sepolia.basescan.org/address/0xd8A6B88b0a0B419fCce6cfBD60F21f1b7761eeB2#code) = this is used as a template so cannot interact directly
- DelegatableResolverFactory = [0xCcFC8Be7f65E1D46Af71cf6C06668DDA25f51e3e](https://sepolia.basescan.org/address/0xCcFC8Be7f65E1D46Af71cf6C06668DDA25f51e3e#code)

#### L1
- OPVerifier = [0xAdef74372444e716C0473dEe1F9Cb3108EFa3818](https://sepolia.etherscan.io/address/0xAdef74372444e716C0473dEe1F9Cb3108EFa3818#code
)
- L1Resolver = [0xF6EfB10e47d6D4C1023BBFa5e6396B00915FbD41](https://sepolia.etherscan.io/address/0xF6EfB10e47d6D4C1023BBFa5e6396B00915FbD41#code) = Currently `base.evmgateway.eth` is set to the resolver

### Arbitrum on Sepolia

#### L2
- DelegatableResolver = [0xCcFC8Be7f65E1D46Af71cf6C06668DDA25f51e3e](https://api-sepolia.arbiscan.io/address/0xCcFC8Be7f65E1D46Af71cf6C06668DDA25f51e3e#code) this is used as a template so cannot interact directly
- DelegatableResolverFactory = [0xF2c102E96A183fC598d83fDccF4e30cfE83aedCd](https://api-sepolia.arbiscan.io/address/0xF2c102E96A183fC598d83fDccF4e30cfE83aedCd#code)

#### L1
- ArbVerifier = [0x6820E47CED34D6F275c6d26C3876D48B2c1fdf27](https://sepolia.etherscan.io/address/0x6820E47CED34D6F275c6d26C3876D48B2c1fdf27#code)
- L1Resolver = [0xA47b9B72571e23604f067dfd4F22785c33E9cF9c](https://sepolia.etherscan.io/address/0xA47b9B72571e23604f067dfd4F22785c33E9cF9c#code) = Currently `arb.evmgateway.eth` is set to the resolver

## Usage

### Move resolver to L2

On L1

```js
// On L1
await ENS.setResolver(l1lresolver)
const l2resolverAddress = await DelegatableResolverFactory.predictAddress(OWNER_ADDRESS)
await L1Resolver.setTarget(encodedname, l2resolverAddress)
// On L2
const l2resolverAddress = await DelegatableResolverFactory.predictAddress(OWNER_ADDRESS)
await DelegatableResolverFactory.create(OWNER_ADDRESS)
await DelegatableResolver['setAddr(bytes32,address)'](node, OWNER_ADDRESS)
// On L1
const abi = [
  "function addr(bytes32) view returns (address)",
  "function resolve(bytes,bytes) view returns (bytes)",
]
const i = new ethers.Interface(abi)
const calldata = i.encodeFunctionData("addr", [node])
const result2 = await l1resolver.resolve(encodedname, calldata, { enableCcipRead: true })
const address = i.decodeFunctionResult("addr", result2)[0]
```

NOTE: The l1 resolver must be queried through `resolve` function to handle subnames

Using the scripts

```
DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY L1_PROVIDER_URL=$L1_PROVIDER_URL L2_PROVIDER_URL=$L2_PROVIDER_URL L1_ETHERSCAN_API_KEY=$L1_ETHERSCAN_API_KEY L2_ETHERSCAN_API_KEY=$L2_ETHERSCAN_API_KEY L2_PROVIDER_URL=$L2_PROVIDER_URL L2_RESOLVER_FACTORY_ADDRESS=$L2_RESOLVER_FACTORY_ADDRESS L1_RESOLVER_ADDRESS=$L1_RESOLVER_ADDRESS ENS_NAME=$ENS_NAME yarn setupl1
```

```
DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY L1_PROVIDER_URL=$L1_PROVIDER_URL L2_PROVIDER_URL=$L2_PROVIDER_URL L1_ETHERSCAN_API_KEY=$L1_ETHERSCAN_API_KEY L2_ETHERSCAN_API_KEY=$L2_ETHERSCAN_API_KEY L2_PROVIDER_URL=$L2_PROVIDER_URL L2_RESOLVER_FACTORY_ADDRESS=$L2_RESOLVER_FACTORY_ADDRESS ENS_NAME=$ENS_NAME yarn setupl2 --network optimismSepolia/baseSepolia/arbitrumSepolia
```

```
L1_PROVIDER_URL=$L1_PROVIDER_URL L1_ETHERSCAN_API_KEY=$L1_ETHERSCAN_API_KEY L2_ETHERSCAN_API_KEY=$L2_ETHERSCAN_API_KEY L2_PROVIDER_URL=$L2_PROVIDER_URL  ENS_NAME=$ENS_NAME yarn getaddr
```

### Issue subname to L2

Assuming you have already moved the parent name to a l2, 


```js
// On L2
const OPERATOR_ADDRESS = ''
const PARENT_NAME = 'op.evmgateway.eth'
const SUBNAME = `${SUBNAME}.${PARENT_NAME}`
const l2resolverAddress = await DelegatableResolverFactory.predictAddress(OWNER_ADDRESS)
const DelegatableResolver = new ethers.Contract(l2resolverAddress, abi, l2provider);
await DelegatableResolver.approve(encodedname, OWNER_ADDRESS, true)
```

Using the script

```
OPERATOR_ADDRESS=$OPERATOR_ADDRESS DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY L1_PROVIDER_URL=$L1_PROVIDER_URL L2_PROVIDER_URL=$L2_PROVIDER_URL L1_ETHERSCAN_API_KEY=$L1_ETHERSCAN_API_KEY L2_ETHERSCAN_API_KEY=$L2_ETHERSCAN_API_KEY L2_PROVIDER_URL=$L2_PROVIDER_URL L2_RESOLVER_FACTORY_ADDRESS=$L2_RESOLVER_FACTORY_ADDRESS ENS_SUBNAME=$ENS_SUBNAME yarn approve --network optimismSepolia/baseSepolia/arbSepolia
```

Once done, set addrss of the subname from the operator, wait 10~20 min, then query the subname on L1


