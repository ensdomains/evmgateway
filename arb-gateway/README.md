# @ensdomains/arb-gateway

An instantiation of [evm-gateway](https://github.com/ensdomains/evmgateway/tree/main/evm-gateway) that targets Optimism - that is, it implements a CCIP-Read gateway that generates proofs of contract state on Optimism.

For a detailed readme and usage instructions, see the [monorepo readme](https://github.com/ensdomains/evmgateway/tree/main).

## How to use op-gateway locally via cloudflare dev env (aka wrangler)

```
npm install -g bun
cd op-gateway
bun install
touch .dev.vars
## set L1_PROVIDER_URL, L2_PROVIDER_URL, L2_OUTPUT_ORACLE, DELAY=5
yarn dev
```

## How to deploy op-gateway to cloudflare

```
cd op-gateway
npm install -g wrangler
wrngler login
wrangler secret put L1_PROVIDER_URL
wrangler secret put L2_PROVIDER_URL
wrangler secret put L2_OUTPUT_ORACLE
wrangler secret put DELAY
yarn deploy
```

## How to test

1. Start the Nitro Test node. You can find instructions here: https://docs.arbitrum.io/node-running/how-tos/local-dev-node
2. Retrieve the Rollup address from the Node's Logs.
3. Replace the rollup address in the files `arb-verifier/test/testArbVerifier.ts` and `arb-verifier/deploy_l1/00_arb_verifier.ts`.
4. Build the Project.
5. Navigate to the Gateway directory using `cd ./arb-gateway`.
6. Start the Gateway by running `bun run start -u http://127.0.0.1:8545/ -v http://127.0.0.1:8547/ -o 0xb264babb91df9d1ca05c8c2028288dc08c4bee46  -p 8089`.
7. Open another Terminal Tab and navigate to the verifier directory using `cd ./arb-verifier/`.
8. Deploy contracts to the node using the command `npx hardhat --network arbDevnetL1 deploy`.
9. Run the test using the command `bun run test`.

## Current deployments

### Goerli

#### Contracts

#### Example contracts

#### Example contracts(ArbitrumGoerli)

#### Gateway
