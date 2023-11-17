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
