# @ensdomains/op-gateway

An instantiation of [evm-gateway](https://github.com/ensdomains/evmgateway/tree/main/evm-gateway) that targets Optimism - that is, it implements a CCIP-Read gateway that generates proofs of contract state on Optimism.

For a detailed readme and usage instructions, see the [monorepo readme](https://github.com/ensdomains/evmgateway/tree/main).

## How to use op-gateway locally via cloudflare dev env (aka wrangler)

```
cd op-gateway
npm install -g bun wrangler
bun install
touch .dev.vars
## set L1_PROVIDER_URL, L2_PROVIDER_URL, L2_OUTPUT_ORACLE, DELAY=5
bun run dev
```

## How to deploy op-gateway to cloudflare

```
cd op-gateway
npm install -g wrangler
wrangler login
wrangler secret put L1_PROVIDER_URL --env op-sepolia|base-sepolia
wrangler secret put L2_PROVIDER_URL --env op-sepolia|base-sepolia
wrangler secret put L2_OUTPUT_ORACLE --env op-sepolia|base-sepolia
wrangler secret put DELAY --env op-sepolia|base-sepolia
wrangler secret put ENDPOINT_URL --env op-sepolia|base-sepolia
yarn deploy --env op-sepolia|base-sepolia
```

## How to test

```
cd ../l1-verifier
PROVIDER_URL=$PROVIDER_URL TARGET_ADDRESS=$TARGET_ADDRESS yarn remote_test
```
