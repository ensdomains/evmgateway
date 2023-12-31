# @ensdomains/op-verifier

A complete Solidity library that facilitates sending CCIP-Read requests for Optimism state, and verifying the responses.

For a detailed readme and usage instructions, see the [monorepo readme](https://github.com/ensdomains/evmgateway/tree/main).

## Testing

Start up a devnet by following Optimism's instructions [here](https://community.optimism.io/docs/developers/build/dev-node/#do-i-need-this).

Then, deploy the L2 contract:

```
bun run hardhat deploy --network opDevnetL2
```

Followed by the L1 contract:

```
bun run hardhat deploy --network opDevnetL1
```

The L1 contracts contain a reference to the L2 contract, and so will require redeploying if the L2 contract changes.

Finally, run the tests:

```
hardhat test --network opDevnetL1
```

The tests will require small modifications to work on public testnets; specifically, contract addresses are currently fetched from `http://localhost:8080/addresses.json`; this will need to be made conditional on the network being used.

## Deployed addresses

### Optimism

#### L1

- OPVerifier = [0x0e8DA38565915B7e74e2d78F80ba1BF815F34116](https://sepolia.etherscan.io/address/0x0e8DA38565915B7e74e2d78F80ba1BF815F34116#code)
- TestL1 = [0x00198c6c94522A81698190ADF411641995Eb180c](https://sepolia.etherscan.io/address/0x00198c6c94522A81698190ADF411641995Eb180c#code
)
#### L2

- TestL2 = [0x94fbCE7ca1a0152cfC99F90f4421d31cf356c896](https://sepolia-optimism.etherscan.io/address/0x94fbCE7ca1a0152cfC99F90f4421d31cf356c896)

#### Gateway url

- https://op-sepolia-gateway-worker.ens-cf.workers.dev/{sender}/{data}.json

### Base

#### L1

- OPVerifier = [0xAdef74372444e716C0473dEe1F9Cb3108EFa3818](https://sepolia.etherscan.io/address/0xAdef74372444e716C0473dEe1F9Cb3108EFa3818#code
)
- TestL1 = [0x540C93800699C044dB8cf1f0F059ca0FA5CaED92](https://sepolia.etherscan.io/address/0x540C93800699C044dB8cf1f0F059ca0FA5CaED92#code)

#### L2

- TestL2 = [0x94fbCE7ca1a0152cfC99F90f4421d31cf356c896](https://sepolia.basescan.org/address/0x94fbCE7ca1a0152cfC99F90f4421d31cf356c896#code)

#### Gateway url

- https://base-sepolia-gateway-worker.ens-cf.workers.dev/{sender}/{data}.json

## Testing gateway

```
TARGET_ADDRESS=$TEST_L1_ADDRESS PROVIDER_URL=$L1_PROVIDER_URL npx hardhat run ../l1-verifier/scripts/remote.ts --network sepolia
```