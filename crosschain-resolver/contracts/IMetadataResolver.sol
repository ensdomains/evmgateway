// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IMetadataResolver {
    /**
     * @notice Get metadata about the CCIP Resolver ENSIP 16 https://docs.ens.domains/ens-improvement-proposals/ensip-16-offchain-metadata
     * @dev This function provides metadata about the CCIP Resolver, including its name, coin type, GraphQL URL, storage type, and encoded information.
     * @param name The domain name in format (dnsEncoded)
     * @return coinType Resolvers coin type (60 for Ethereum)
     * @return graphqlUrl The GraphQL URL used by the resolver
     * @return storageType 0 = EVM, 1 = Non blockchain, 2 = Starknet
     * @return storageLocation The storage identifier. For EVM chains, this is the address of the resolver contract.
     * @return context can be l2 resolver contract address for evm chain but can be any l2 storage identifier for non evm chain
     *
     */
    function metadata(bytes calldata name) external view returns (
        uint256 coinType,
        string memory graphqlUrl,
        uint8 storageType,
        bytes memory storageLocation,
        bytes memory context
    );
}