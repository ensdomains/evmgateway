# @ensdomains/scroll-gateway

An instantiation of [evm-gateway](https://github.com/ensdomains/evmgateway/tree/main/evm-gateway) that targets Scroll - that is, it implements a CCIP-Read gateway that generates proofs of contract state on Scroll.

For a detailed readme and usage instructions, see the [monorepo readme](https://github.com/ensdomains/evmgateway/tree/main).

To get started, you need to have an RPC URL for both Ethereum Mainnet and Scroll. You also need to provide an L2_ROLLUP address which is the Rollup contract deployed on Mainnet or the Nitro Node.

## How to use scroll-gateway locally via cloudflare dev env (aka wrangler)

```
npm install -g bun
cd scroll-gateway
bun install
touch .dev.vars
## set L2_PROVIDER_URL and SEARCH_URL(the default for sepolia is https://sepolia-rpc.scroll.io)
yarn dev
```

## How to deploy scroll-gateway to cloudflare

```
cd scroll-gateway
npm install -g wrangler
wrngler login

wrangler secret put L2_PROVIDER_URL
yarn deploy
```

## How to test

There is currently no local test node. You need to deploy to public testnet and run the test.
1. deploy l2 contract`L2_ETHERSCAN_API_KEY=$L2_ETHERSCAN_API_KEY DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY L2_PROVIDER_URL=$L2_PROVIDER_URL npx hardhat deploy --network scrollSepolia`
2. deploy l1 contract. Modify GATEWAY_URLS on 00_scroll_verifier.ts to point to localhost and run  `L1_ETHERSCAN_API_KEY=$L1_ETHERSCAN_API_KEY DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY L1_PROVIDER_URL=$L1_PROVIDER_URL ROLLUP_ADDRESS=$ROLLUP_ADDRESS  npx hardhat deploy --network sepolia`
3. startup gateway server
```
cd ../evm-gateway
// Add .dev.vars and add L1_PROVIDER_URL, L2_PROVIDER_URL, and L2_ROLLUP
yarn dev
```
4. run the test `DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY L1_PROVIDER_URL=$L1_PROVIDER_URL ROLLUP_ADDRESS=$ROLLUP_ADDRESS yarn test --network sepolia`
