# @ensdomains/op-verifier

A complete Solidity library that facilitates sending CCIP-Read requests for Optimism state, and verifying the responses.

For a detailed readme and usage instructions, see the [monorepo readme](https://github.com/ensdomains/evmgateway/tree/main).

## Testing

This repo is currently pinned to a fork of hardhat-deploy due to [this bug](https://github.com/wighawag/hardhat-deploy/issues/490). Once resolved it can be pointed back at the latest release.

Due to this, after running `yarn` you will need to `cd node_modules/hardhat-deploy` and do `git submodule init && git submodule update && yarn build`.

Start up a devnet by following Optimism's instructions [here](https://community.optimism.io/docs/developers/build/dev-node/#do-i-need-this).

Then, deploy the L2 contract:

```
hardhat deploy --network opDevnetL2
```

Followed by the L1 contract:

```
hardhat deploy --network opDevnetL1
```

The L1 contracts contain a reference to the L2 contract, and so will require redeploying if the L2 contract changes.

Finally, run the tests:

```
hardhat test --network opDevnetL1
```

The tests will require small modifications to work on public testnets; specifically, contract addresses are currently fetched from `http://localhost:8080/addresses.json`; this will need to be made conditional on the network being used.

## How to use l1-gateway locally

```
cd l1-gateway
yarn
touch .dev.vars
## set WORKER_PROVIDER_URL
yarn dev
```

## How to deploy l1-gateway to cloudflare

```
cd l1-gateway
npm install -g wrangler
wrngler login
wrangler secret put WORKER_PROVIDER_URL
yarn deploy
```

## How to test

```
cd ../l1-verifier l1-gateway
PROVIDER_URL=$PROVIDER_URL TARGET_ADDRESS=$TARGET_ADDRESS yarn remote_test
```

## Current deployments

## L1 Gateway

- Verifier = [0xA63381212fBf7AA2D0b4a2cAe453f8c361B11d06](https://goerli.etherscan.io/address/0xA63381212fBf7AA2D0b4a2cAe453f8c361B11d06)
- TestL1 = [0xD5b1cB24f9BA18C9c35b3D090309E643bC77491e](https://goerli.etherscan.io/address/0xD5b1cB24f9BA18C9c35b3D090309E643bC77491e)
- TestL2 = [0x43c0CBb8943E394FaE4C4def054D7702c29c9037](https://goerli.etherscan.io/address/0x43c0CBb8943E394FaE4C4def054D7702c29c9037)
