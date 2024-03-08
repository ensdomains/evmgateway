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
- OP_VERIFIER_ADDRESS=0x0c2746F20C9c97DBf718de10c04943cf408230A3

```
bun run hardhat deploy --network optimismGoerli
```

Followed by the L1 contract:

```
bun run hardhat deploy --network goerli
```


## Deployments
