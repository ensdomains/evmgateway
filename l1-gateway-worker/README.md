# @ensdomains/l1-gateway-worker

An instantiation of [evm-gateway](https://github.com/ensdomains/evmgateway/tree/main/evm-gateway) that targets Ethereum L1 - that is, it implements a CCIP-Read gateway that generates
proofs of contract state on L1.

This may at first seem useless, but as the simplest possible practical EVM gateway implementation, it acts as an excellent
target for testing the entire framework end-to-end.

It may also prove useful for contracts that wish to trustlessly establish the content of storage variables of other contracts,
or historic values for storage variables of any contract.

## How to setup

```
cd l1-gateway-worker
yarn
```

## How to use locally

```
touch .dev.vars
## set WORKER_PROVIDER_URL
yarn start
```

## How to deploy to cloudflare

```
npm install -g wrangler
wrngler login
wrangler secret put WORKER_PROVIDER_URL
yarn deploy
```

## How to test

```
cd ../l1-verifier
PROVIDER_URL=$PROVIDER_URL TARGET_ADDRESS=$TARGET_ADDRESS yarn remote_test
```

## Current deployments

- Verifier = [0xA63381212fBf7AA2D0b4a2cAe453f8c361B11d06](https://goerli.etherscan.io/address/0xA63381212fBf7AA2D0b4a2cAe453f8c361B11d06)
- TestL1 = [0xD5b1cB24f9BA18C9c35b3D090309E643bC77491e](https://goerli.etherscan.io/address/0xD5b1cB24f9BA18C9c35b3D090309E643bC77491e)
- TestL2 = [0x43c0CBb8943E394FaE4C4def054D7702c29c9037](https://goerli.etherscan.io/address/0x43c0CBb8943E394FaE4C4def054D7702c29c9037)
