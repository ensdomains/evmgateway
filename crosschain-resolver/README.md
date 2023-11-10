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



## Deploying (Goerli)

Create `.env` and set the following variables

- DEPLOYER_PRIVATE_KEY
- L1_PROVIDER_URL
- L2_PROVIDER_URL
- L1_ETHERSCAN_API_KEY
- L2_ETHERSCAN_API_KEY
- VERIFIER_ADDRESS
- ENS_ADDRESS
- WRAPPER_ADDRESS
```
bun run hardhat deploy --network optimismGoerli
```

Followed by the L1 contract:

```
bun run hardhat deploy --network goerli
```

## Deployments

### OP
#### L2
- DelegatableResolver = [0xE00739Fc93e27aBf44343fD5FAA151c67C0A0Aa3](https://goerli-optimism.etherscan.io/address/0xE00739Fc93e27aBf44343fD5FAA151c67C0A0Aa3)
- DelegatableResolverFactory = [0xacB9771923873614d77C914D716d8E25dAF09b8d](https://goerli-optimism.etherscan.io/address/0xacB9771923873614d77C914D716d8E25dAF09b8d)
#### L1
- L1Resolver = [0x65a0963A2941A13a96FcDCfE36c94c6a341f26E5](https://goerli.etherscan.io/address/0x65a0963A2941A13a96FcDCfE36c94c6a341f26E5) = Currently `op.evmgateway.eth` is set to the resolver


## Usage

TODO