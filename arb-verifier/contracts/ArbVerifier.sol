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

interface IOutbox {
    function roots(bytes32) external view returns (bytes32); // maps root hashes => L2 block hash
}

contract ArbVerifier is IEVMVerifier {
    //Todo replace with IFace
    IOutbox public immutable outbox;
    string[] _gatewayURLs;

    constructor(IOutbox _outboxAddress, string[] memory _urls) {
        outbox = _outboxAddress;
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
        (ArbWitnessData memory opData, StateProof memory stateProof) = abi
            .decode(proof, (ArbWitnessData, StateProof));

        console.log('hello');
        console.logBytes32(opData.stateRoot);

        return
            EVMProofHelper.getStorageValues(
                target,
                commands,
                constants,
                opData.stateRoot,
                stateProof
            );
    }
}
