// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IMetadataResolver {
    /*
     * @notice Get metadata about the CCIP Resolver ENSIP 16 https://docs.ens.domains/ens-improvement-proposals/ensip-16-offchain-metadata
     * @dev This function provides metadata about the CCIP Resolver, including its name, coin type, GraphQL URL, storage type, and encoded information.
     * @param name The domain name in format (dnsEncoded)
     * @return coinType The cointype of the chain the target contract locates such as Optimism, Base, Arb, etc
     * @return graphqlUrl The GraphQL URL used by the resolver
     * @return storageType 0 = EVM, 1 = Non blockchain, 2 = Starknet
     * @return storageLocation The storage identifier. For EVM chains, this is the address of the resolver contract.
     * @return context. An identifier used by l2 graph indexer for Domain schema id (`context-namehash`) allowing multiple resolver contracts to have own namespace.
     *
     */
    function metadata(bytes calldata name) external view returns (
        uint256 coinType,
        string memory graphqlUrl,
        uint8 storageType,
        bytes memory storageLocation,
        bytes memory context
    );

    event MetadataChanged(
        bytes name,
        uint256 coinType,
        string graphqlUrl,
        uint8 storageType,
        bytes storageLocation,
        bytes context
    );
}