//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {StateProof, EVMProofHelper} from '@ensdomains/evm-verifier/contracts/EVMProofHelper.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';
import {Node, IRollupCore} from '@arbitrum/nitro-contracts/src/rollup/IRollupCore.sol';
import {RLPReader} from '@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol';

import 'hardhat/console.sol';
struct ArbWitnessData {
    bytes32 version;
    bytes32 sendRoot;
    bytes32 blockHash;
    uint64 nodeIndex;
    bytes rlpEncodedBlock;
}

contract ArbVerifier is IEVMVerifier {
    //Todo replace with IFace
    IRollupCore public immutable rollup;
    string[] _gatewayURLs;

    constructor(IRollupCore _rollupAddress, string[] memory _urls) {
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

        bytes32 confirmData = keccak256(
            abi.encodePacked(arbData.blockHash, arbData.sendRoot)
        );

        console.log('idx');
        console.log(arbData.nodeIndex);
        Node memory rblock = rollup.getNode(arbData.nodeIndex);
        require(rblock.confirmData == confirmData, 'confirmData mismatch');

        bytes32 stateRoot = decodeBlock(arbData.rlpEncodedBlock);

        values = EVMProofHelper.getStorageValues(
            target,
            commands,
            constants,
            stateRoot,
            stateProof
        );
    }

    function decodeBlock(
        bytes memory rlpEncdoedBlock
    ) internal pure returns (bytes32) {
        RLPReader.RLPItem[] memory i = RLPReader.readList(rlpEncdoedBlock);
        return bytes32(RLPReader.readBytes(i[3]));
    }
}
