// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IMetadataResolver {
    /**
     * @notice Get metadata about the CCIP Resolver
     * @dev This function provides metadata about the CCIP Resolver, including its name, coin type, GraphQL URL, storage type, and encoded information.
     * @param name The domain name in format (dnsEncoded)
     * @return name The name of the resolver ("CCIP RESOLVER")
     * @return coinType Resolvers coin type (60 for Ethereum)
     * @return graphqlUrl The GraphQL URL used by the resolver
     * @return storageType Storage Type (0 for EVM)
     * @return storageLocation The storage identifier. For EVM chains, this is the address of the resolver contract.
     * @return context can be l2 resolver contract address for evm chain but can be any l2 storage identifier for non evm chain
     *
     */
    function metadata(bytes calldata name) external view returns (string memory, uint256, string memory, uint8, bytes memory, bytes memory);
}