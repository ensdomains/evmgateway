# @ensdomains/l1-gateway
An instantiation of [evm-gateway](https://github.com/ensdomains/evmgateway/tree/main/evm-gateway) that targets Ethereum L1 - that is, it implements a CCIP-Read gateway that generates
proofs of contract state on L1.

This may at first seem useless, but as the simplest possible practical EVM gateway implementation, it acts as an excellent
target for testing the entire framework end-to-end.

It may also prove useful for contracts that wish to trustlessly establish the content of storage variables of other contracts,
or historic values for storage variables of any contract.

For a detailed readme and usage instructions, see the [monorepo readme](https://github.com/ensdomains/evmgateway/tree/main).
