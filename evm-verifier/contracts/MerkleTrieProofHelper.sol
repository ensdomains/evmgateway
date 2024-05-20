// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/* Library Imports */
import { SecureMerkleTrie } from "./SecureMerkleTrie.sol";
import {RLPReader} from '@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol';

/**
 * @title MerkleTrieProofHelper
 * @notice MerkleTrieProofHelper is a helper library that has functions to interact
 *         with SecureMerkleTrie.
 */
library MerkleTrieProofHelper {
    error AccountNotFound(address);

    /*
     * @notice Get the storage value for the provided merkle proof
     * @param address Unused. Required so the function signature matches the one required by `EVMProofHelper`
     * @param slot The storage key we are fetching the value of
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
