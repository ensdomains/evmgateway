// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IMetadataResolver {
    /*
     * @notice Get metadata about the CCIP Resolver ENSIP 16 https://docs.ens.domains/ens-improvement-proposals/ensip-16-offchain-metadata
     * @dev This function provides metadata about the CCIP Resolver, including its name, coin type, GraphQL URL, storage type, and encoded information.
     * @param name The domain name in format (dnsEncoded)
     * @return graphqlUrl The GraphQL URL used by the resolver
     *
     */
    function metadata(bytes calldata name) external view returns (
        string memory graphqlUrl
    );

    event MetadataChanged(
        bytes name,
        string graphqlUrl
    );
}