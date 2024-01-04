# @ensdomains/arb-verifier

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

### Goerli

#### L2

- TestL2.sol = [0xAdef74372444e716C0473dEe1F9Cb3108EFa3818](https://goerli.arbiscan.io/address/0xAdef74372444e716C0473dEe1F9Cb3108EFa3818#code)

#### L1

- ArbVerifier = [0x9E46DeE08Ad370bEFa7858c0E9a6c87f2D7E57A1](https://goerli.etherscan.io/address/0x9E46DeE08Ad370bEFa7858c0E9a6c87f2D7E57A1#code)

- TestL1.sol = [0x0d6c6B70cd561EB59e6818D832197fFad60840AB](https://goerli.etherscan.io/address/0x0d6c6B70cd561EB59e6818D832197fFad60840AB#code)

#### Gateway server

- https://arb-gateway-worker.ens-cf.workers.dev


### Sepolia

#### L2

- TestL2.sol = [0x162A433068F51e18b7d13932F27e66a3f99E6890](https://api-sepolia.arbiscan.io/address/0x162A433068F51e18b7d13932F27e66a3f99E6890#code)

#### L1

- ArbVerifier = [0x6820E47CED34D6F275c6d26C3876D48B2c1fdf27](https://sepolia.etherscan.io/address/0x6820E47CED34D6F275c6d26C3876D48B2c1fdf27#code)
- TestL1.sol = [0x50200c7Ccb1abD927184396547ea8dD1A18CAA3A](https://sepolia.etherscan.io/address/0x50200c7Ccb1abD927184396547ea8dD1A18CAA3A#code)

deploying "ArbVerifier" (tx: 0x61ae88749f911f1e09d7c073f34a13bb843c71fafaf93a1266423798bd3aadc6)...: deployed at 0x6820E47CED34D6F275c6d26C3876D48B2c1fdf27 with 3872186 gas
deploying "TestL1" (tx: 0x0a7b6b74357d20f33cb89df12da3db34b5cd3c764403888420108ca13f0126fa)...: deployed at 0x50200c7Ccb1abD927184396547ea8dD1A18CAA3A with 2411152 gas

#### Gateway url

- https://arb-sepolia-gateway-worker.ens-cf.workers.dev

## Testing gateway

```
TARGET_ADDRESS=$TEST_L1_ADDRESS PROVIDER_URL=$L1_PROVIDER_URL npx hardhat run ../l1-verifier/scripts/remote.ts --network sepolia
```