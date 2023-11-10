# @ensdomains/crosschain-reverse-resolver

A reverse resolver contract that is built on top of evm-verifier.

For a detailed readme and usage instructions, see the [monorepo readme](https://github.com/ensdomains/evmgateway/tree/main).


## Deploying (Goerli)

Create `.env` and set the following variables

- DEPLOYER_PRIVATE_KEY
- L1_PROVIDER_URL
- L2_PROVIDER_URL
- L1_ETHERSCAN_API_KEY
- L2_ETHERSCAN_API_KEY
- VERIFIER_ADDRESS
- REVERSE_NAMESPACE

```
bun run hardhat deploy --network optimismGoerli
```

Followed by the L1 contract:

```
bun run hardhat deploy --network goerli
```

## Deployments

### OP
#### L2
- L2ReverseRegistrar = [0x7D006EFd21eb282C8B0a425BAB546517bfEC2cc2](https://goerli-optimism.etherscan.io/address/0x7D006EFd21eb282C8B0a425BAB546517bfEC2cc2) 
#### L1
- L1ReverseResolver = [0xeEB5832Ea8732f7EF06d468E40F562c9D7347795](https://goerli.etherscan.io/address/0xeEB5832Ea8732f7EF06d468E40F562c9D7347795)
