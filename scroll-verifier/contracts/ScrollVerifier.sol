//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {EVMProofHelper} from '@ensdomains/evm-verifier/contracts/EVMProofHelper.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';
import {RLPReader} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol";


interface IScrollChain {
    /// @param batchIndex The index of the batch.
    /// @return The state root of a committed batch.
    function finalizedStateRoots(uint256 batchIndex) external view returns (bytes32);
}

interface IScrollChainCommitmentVerifier {
    function verifyZkTrieProof(
        address account,
        bytes32 storageKey,
        bytes calldata proof
    ) external view returns (bytes32 stateRoot, bytes32 storageValue);

    function rollup() external view returns (address);

    function verifyStateCommitment(
        uint256 batchIndex,
        address account,
        bytes32 storageKey,
        bytes calldata proof
    ) external view returns (bytes32 storageValue);
}

struct ScrollWitnessData {
    uint256 batchIndex;
}

struct StateProof {
    bytes[] storageProofs;          // An array of proofs of individual storage elements 
}

contract ScrollVerifier is IEVMVerifier {
    error InvalidSlotSize(uint256 size);
    error StateRootMismatch(bytes32 expected, bytes32 actual);
    IScrollChainCommitmentVerifier public immutable verifier;
    string[] _gatewayURLs;

    constructor(string[] memory _urls, IScrollChainCommitmentVerifier _verifierAddress) {
        verifier = _verifierAddress;
        _gatewayURLs = _urls;
    }

    /*
     * Retrieves an array of gateway URLs used by the contract.
     * @returns {string[]} An array containing the gateway URLs.
     *     */
    function gatewayURLs() external view returns (string[] memory) {
        return _gatewayURLs;
    }


    function getTrieProof(address target, uint256 slot, bytes memory compressedProof, bytes32 root) internal view returns(bytes memory){
        (bytes32 stateRoot, bytes32 storageValue) = verifier.verifyZkTrieProof(target, bytes32(slot), compressedProof);
        if(stateRoot != root) {
            revert StateRootMismatch(stateRoot, root);
        }
        return abi.encodePacked(storageValue);
    }

    /*
     * Retrieves storage values from the specified target address
     *
     * @param {address} target - The target address from which storage values are to be retrieved.
     * @param {bytes32[]} commands - An array of storage keys (commands) to query.
     * @param {bytes[]} constants - An array of constant values corresponding to the storage keys.
     * @param {bytes} proof - The proof data containing Scroll witness data and state proof.
     */
    function getStorageValues(
        address target,
        bytes32[] memory commands,
        bytes[] memory constants,
        bytes memory proof
    ) external view returns (bytes[] memory values) {
        (ScrollWitnessData memory scrollData, StateProof memory stateProof) = abi.decode(proof, (ScrollWitnessData, StateProof));
        bytes32 expectedStateRoot = IScrollChain(verifier.rollup()).finalizedStateRoots(scrollData.batchIndex);
        return EVMProofHelper.getStorageValues(target, getTrieProof, commands, constants, expectedStateRoot, stateProof.storageProofs);
    }
}
