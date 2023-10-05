# @ensdomains/evm-gateway

A framework for constructing generic CCIP-Read gateways targeting different EVM-compatible chains. This repository
implements all the functionality required to fetch and verify multiple storage slots from an EVM-compatible chain,
omitting only the L2-specific logic of determining a block to target, and verifying the root of the generated proof.

See [@ensdomains/l1-gateway][https://github.com/ensdomains/evmgateway/tree/main/l1-gateway] for an example implementation.

For a detailed readme and usage instructions, see the [monorepo readme](https://github.com/ensdomains/evmgateway/tree/main).
