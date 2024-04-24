//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {StateProof, EVMProofHelper} from '@ensdomains/evm-verifier/contracts/EVMProofHelper.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';

interface IScrollChainCommitmentVerifier {
    function verifyZkTrieProof(
        address account,
        bytes32 storageKey,
        bytes calldata proof
    ) external view returns (bytes32 stateRoot, bytes32 storageValue);

    function verifyStateCommitment(
        uint256 batchIndex,
        address account,
        bytes32 storageKey,
        bytes calldata proof
    ) external view returns (bytes32 storageValue);
}

struct ScrollWitnessData {
    uint256 batchIndex;
    bytes32 storageKey;
    bytes compressedProof;
}

contract ScrollVerifier is IEVMVerifier {
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
        (bytes32 stateRoot, bytes32 storageValue) = verifier.verifyZkTrieProof(target, scrollData.storageKey, scrollData.compressedProof);
        values = new bytes[](1);
        values[0] = abi.encodePacked(storageValue);
    }
}
