// Pulled from https://github.com/ethereum-optimism/optimism/blob/4d13f0afe8869faf7bba45d8339998525ebc5161/packages/contracts-bedrock/contracts/libraries/trie/MerkleTrie.sol
//   as this is the last version of Optimism's Merkle Trie library that supports nonexistence proofs; support was removed
//   in the next commit for some version.
// Copyright 2020-2021 Optimism
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/* Library Imports */
import { SecureMerkleTrie } from "./SecureMerkleTrie.sol";
import {RLPReader} from '@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol';

/**
 * @title SecureMerkleTrie
 * @notice SecureMerkleTrie is a thin wrapper around the MerkleTrie library that hashes the input
 *         keys. Ethereum's state trie hashes input keys before storing them.
 */
library MerkleTrieProofHelper {
    error AccountNotFound(address);

    /*
     * @notice Get the storage value for the provided merkle proof
     * @param target The address we are fetching a storage root for
     * @param witness A witness proving the value of the storage root for `target`.
     * @param root The state root the witness was generated against
     * @return The storage value 
     */

    function getTrieProof(address, uint256 slot, bytes memory witness, bytes32 root) internal pure returns(bytes memory){
        (bytes[] memory _witness) = abi.decode(witness, (bytes[]));

        (bool exists, bytes memory retrievedValue) = SecureMerkleTrie.get(
            abi.encodePacked(slot),
            _witness,
            root
        );
        if(!exists) {
            // Nonexistent values are treated as zero.
            return "";
        }
        return RLPReader.readBytes(retrievedValue);
    }

    /**
     * @notice Get the storage root for the provided merkle proof
     * @param stateRoot The state root the witness was generated against
     * @param target The address we are fetching a storage root for
     * @param witness A witness proving the value of the storage root for `target`.
     * @return The storage root retrieved from the provided state root
     */
    function getStorageRoot(bytes32 stateRoot, address target, bytes memory witness) internal view returns (bytes32) {
        (bytes[] memory _witness) = abi.decode(witness, (bytes[]));
        (bool exists, bytes memory encodedResolverAccount) = SecureMerkleTrie.get(
            abi.encodePacked(target),
            _witness,
            stateRoot
        );
        if(!exists) {
            revert AccountNotFound(target);
        }
        RLPReader.RLPItem[] memory accountState = RLPReader.readList(encodedResolverAccount);
        return bytes32(RLPReader.readBytes(accountState[2]));
    }
}