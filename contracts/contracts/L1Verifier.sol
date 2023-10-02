// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Lib_RLPReader} from "@eth-optimism/contracts/libraries/rlp/Lib_RLPReader.sol";
import { StateProof, EVMProofHelper } from './EVMProofHelper.sol';

struct L1WitnessData {
    uint256 blockNo;
    bytes blockHeader;
}

library L1Verifier {
    function getStorageValues(address target, bytes32[][] memory paths, bytes memory proof) internal view returns(bytes[] memory values) {
        (L1WitnessData memory l1Data, StateProof memory stateProof) = abi.decode(proof, (L1WitnessData, StateProof));
        require(keccak256(l1Data.blockHeader) == blockhash(l1Data.blockNo), "Block header hash mismatch");
        Lib_RLPReader.RLPItem[] memory headerFields = Lib_RLPReader.readList(l1Data.blockHeader);
        bytes32 stateRoot = bytes32(Lib_RLPReader.readBytes(headerFields[3]));
        return EVMProofHelper.getStorageValues(target, paths, stateRoot, stateProof);
    }
}
