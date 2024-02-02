# @ensdomains/op-gateway

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
wrangler secret put L1_PROVIDER_URL --env op-sepolia|base-sepolia
wrangler secret put L2_PROVIDER_URL --env op-sepolia|base-sepolia
wrangler secret put L2_OUTPUT_ORACLE --env op-sepolia|base-sepolia
wrangler secret put DELAY --env op-sepolia|base-sepolia
wrangler secret put ENDPOINT_URL --env op-sepolia|base-sepolia
yarn deploy --env op-sepolia|base-sepolia
```

## How to test

```
cd ../l1-verifier l1-gateway
PROVIDER_URL=$PROVIDER_URL TARGET_ADDRESS=$TARGET_ADDRESS yarn remote_test
```

## Current deployments

### Goerli

#### Contracts

- OPVerifier = [0x0c2746F20C9c97DBf718de10c04943cf408230A3](https://goerli.etherscan.io/address/0x0c2746F20C9c97DBf718de10c04943cf408230A3)

#### Example contracts

- TestL1 = [0x5057276e2BD7750Be043595ac6d21dE31e900c3c](https://goerli.etherscan.io/address/0x5057276e2BD7750Be043595ac6d21dE31e900c3c)

#### Example contracts(OptimismGoerli)

- TestL2 = [0x0FEcD0Fec173807204c7B31e36384acEeB048b0A](https://goerli-optimism.etherscan.io/address/0x0FEcD0Fec173807204c7B31e36384acEeB048b0A)

#### Gateway

- http://op-gateway-worker.ens-cf.workers.dev
