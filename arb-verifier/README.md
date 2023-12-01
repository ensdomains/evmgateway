# @ensdomains/op-verifier

A complete Solidity library that facilitates sending CCIP-Read requests for Arbitrum state, and verifying the responses.

For a detailed readme and usage instructions, see the [monorepo readme](https://github.com/ensdomains/evmgateway/tree/main).

## Testing

Start up a devnet by following Arbitrums's instructions [here](https://docs.arbitrum.io/node-running/how-tos/local-dev-node).

The test requires you to use the rollup address of your node, which may not always be the same. This address is printed in the logs after you've initially set up the node. Copy that value and replace it accordingly. Unfortunately, there is no endpoint to retrieve the rollup address dynamically.

Copy the rollup address from the Node's Logs. Add it to the following files

```
arb-verifier/test/testArbVerifier.ts
```

```
arb-verifier/deploy_l1/00_arb_verifier.ts
```

Build the project

```
bun run build
```

Open another terminal window and start the Gateway

```
cd ./arb-gateway && bun run start -u http://127.0.0.1:8545/ -v http://127.0.0.1:8547/ -o $ROLLUP_ADDRESS  -p 8089
```

Go back to the first Termina window and deploy the contracts to the test node

```
npx hardhat --network arbDevnetL1 deploy && npx hardhat --network arbDevnetL2 deploy
```

Finally, run the tests:

```
bun run test
```

## Deployments

### L2

- TestL2.sol = [0xAdef74372444e716C0473dEe1F9Cb3108EFa3818](https://goerli.arbiscan.io/address/0xAdef74372444e716C0473dEe1F9Cb3108EFa3818#code)

### L1

- ArbVerifier = [0x9E46DeE08Ad370bEFa7858c0E9a6c87f2D7E57A1](https://goerli.etherscan.io/address/0x9E46DeE08Ad370bEFa7858c0E9a6c87f2D7E57A1#code)

- TestL1.sol = [0x0d6c6B70cd561EB59e6818D832197fFad60840AB](https://goerli.etherscan.io/address/0x0d6c6B70cd561EB59e6818D832197fFad60840AB#code)

### Gateway server

- https://arb-gateway-worker.ens-cf.workers.dev

