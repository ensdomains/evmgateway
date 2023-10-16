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

## TODO

- Remove duplicate code
- Avoid dynamically importing libraries
