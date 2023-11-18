//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {StateProof, EVMProofHelper} from '@ensdomains/evm-verifier/contracts/EVMProofHelper.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';

import 'hardhat/console.sol';
struct ArbWitnessData {
    bytes32 version;
    bytes32 stateRoot;
    bytes32 latestBlockhash;
}

interface IRollup {
    function roots(bytes32) external view returns (bytes32); // maps root hashes => L2 block hash
}

contract ArbVerifier is IEVMVerifier {
    //Todo replace with IFace
    IRollup public immutable rollup;
    string[] _gatewayURLs;

    constructor(IOutbox _rollupAddress, string[] memory _urls) {
        rollup = _rollupAddress;
        _gatewayURLs = _urls;
    }

    function gatewayURLs() external view returns (string[] memory) {
        return _gatewayURLs;
    }

    function getStorageValues(
        address target,
        bytes32[] memory commands,
        bytes[] memory constants,
        bytes memory proof
    ) external view returns (bytes[] memory values) {
        (ArbWitnessData memory arbData, StateProof memory stateProof) = abi
            .decode(proof, (ArbWitnessData, StateProof));

        console.log('stateeRoot');

        console.logBytes32(arbData.stateRoot);

        values = EVMProofHelper.getStorageValues(
            target,
            commands,
            constants,
            arbData.stateRoot,
            stateProof
        );
    }

    function prooooooof(
        uint64 nodeIndex,
        bytes32 blockHash,
        bytes32 sendRoot
    ) internal {
        bytes32 confirmdata = keccak256(abi.encodePacked(blockHash, sendRoot));
        Node memory rblock = rollup.getNode(nodeIndex);
        require(rblock.confirmData == confirmdata, 'confirmData mismatch');

        bytes32 givenRoot = keccak256(abi.encodePacked(confirmData, stateRoot));

        
    }
}
