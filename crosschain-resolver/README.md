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

### OP
#### L2
- DelegatableResolver = [0xE00739Fc93e27aBf44343fD5FAA151c67C0A0Aa3](https://goerli-optimism.etherscan.io/address/0xE00739Fc93e27aBf44343fD5FAA151c67C0A0Aa3) = this is used as a template so cannot interact directly
- DelegatableResolverFactory = [0xacB9771923873614d77C914D716d8E25dAF09b8d](https://goerli-optimism.etherscan.io/address/0xacB9771923873614d77C914D716d8E25dAF09b8d)

- DelegatableResolverRegistrar = [DelegatableResolverRegistrar](https://goerli-optimism.etherscan.io/address/0x2b07cf3ef421a5ff1cb6f437036bdef132eea37b#writeContract) = Demo contract that allow anyone to register subname under `op.evmgateway.eth` on  [L2 resolver on `op.evmgateway.eth`](https://goerli-optimism.etherscan.io/address/0x96753bd0D9bdd98d3a84837B5933078AF49aF12d#writeContract)

#### L1
- L1Resolver = [0x7Bf57B0a683CC964B0fEe30633A72F5c05464a0f](https://goerli.etherscan.io/address/0x7Bf57B0a683CC964B0fEe30633A72F5c05464a0f) = Currently `op.evmgateway.eth` is set to the resolver

### Base

#### L2
- DelegatableResolver = [0x60BDFeF9ff7bB47d95d1658Be925587F046AE2C7](https://goerli.basescan.org/address/0x7d56Bc48F0802319CB7C79B421Fa5661De905AF7) = this is used as a template so cannot interact directly
- DelegatableResolverFactory = [0x7d56Bc48F0802319CB7C79B421Fa5661De905AF7](https://goerli.basescan.org/address/0x7d56Bc48F0802319CB7C79B421Fa5661De905AF7)

- DelegatableResolverRegistrar = [DelegatableResolverRegistrar](https://goerli.basescan.org/address/0xe0356133c3c43cbb623543488e607e4e349eaa10#code) = Demo contract that allow anyone to register subname under `base.evmgateway.eth` on  [L2 resolver on `base.evmgateway.eth`](https://goerli.basescan.org/address/0xE4B18eFbF71d516046514598FD7FcFbad4beC742)

#### L1
- L1Resolver = [0x3Ac25843A1F696fe2166C5dE127FD4f2832F4d42](https://goerli.etherscan.io/address/0x3Ac25843A1F696fe2166C5dE127FD4f2832F4d42) = Currently `base.evmgateway.eth` is set to the resolver


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
DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY L1_PROVIDER_URL=$L1_PROVIDER_URL L2_PROVIDER_URL=$L2_PROVIDER_URL L1_ETHERSCAN_API_KEY=$L1_ETHERSCAN_API_KEY L2_ETHERSCAN_API_KEY=$L2_ETHERSCAN_API_KEY L2_PROVIDER_URL=$L2_PROVIDER_URL L2_RESOLVER_FACTORY_ADDRESS=$L2_RESOLVER_FACTORY_ADDRESS ENS_NAME=$ENS_NAME yarn setupl2
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
OPERATOR_ADDRESS=0x5A384227B65FA093DEC03Ec34e111Db80A040615
DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY L1_PROVIDER_URL=$L1_PROVIDER_URL L2_PROVIDER_URL=$L2_PROVIDER_URL L1_ETHERSCAN_API_KEY=$L1_ETHERSCAN_API_KEY L2_ETHERSCAN_API_KEY=$L2_ETHERSCAN_API_KEY L2_PROVIDER_URL=$L2_PROVIDER_URL L2_RESOLVER_FACTORY_ADDRESS=$L2_RESOLVER_FACTORY_ADDRESS ENS_SUBNAME=$ENS_SUBNAME yarn approve
```

Once done, set addrss of the subname from the operator, wait 10~20 min, then query the subname on L1


### Create subname registrar

#### Step 1: Find out the corresponding L2 resolvers on L1

```
> const packet = require('dns-packet');
> const ethers = require('ethers');
> const encodeName = (name) => '0x' + packet.name.encode(name).toString('hex')
> encodedbasename = encodeName('')
'0x0000'
> node = ethers.namehash('base.evmgateway.eth')
'0xb164280377eb563e73caf38ac5693328813c1ed18f9bd925d17d5f59b22421f0'
> encodedname = encodeName('base.evmgateway.eth')
'0x04626173650a65766d676174657761790365746800'
> subnode = ethers.namehash('makoto.base.evmgateway.eth')
'0xe399336bd17b7d9660834201b6b166196290ceca5a41b402c033e3026d4e17d1'
> encodedsubname = encodeName('makoto.base.evmgateway.eth')
'0x066d616b6f746f04626173650a65766d676174657761790365746800'
```

Go to [Base L1 resolver](https://goerli.etherscan.io/address/0x052D7E10D55Ae12b4F62cdE18dBb7E938efa230D#readContract)

```
[node, target] = l1resolver.getTarget(encodedname)
```

#### Step 2: Deploy the registrar contract

Deploy [DelegatableResolverRegistrar.sol](https://gist.github.com/makoto/7d83ca6530adc69fea27923ee8ae8986) to L2 with resolver address as `target` which you obtained at step 1.
Take notes of the deployed registrar address 

#### Step 3: Delegate the registrar contract to root

Go to the target address and approve the newly created registrar address as the operator ob the base node

```
l2resolver.approve(baseencodedname,registrarAddress, true)
```

Once done, anyone can register subnames on "base.evmgateway.eth" (NOTE: currently there is no notion of ownership so other people can overtake the names) from the L2 Registrar

```
l2registrar.register(encodedsubname, subnameuser)
l2resolver['setAddr(bytes32,address)](subnode, subnameuser)
```