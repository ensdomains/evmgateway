// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {RLPReader} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol";
import {Bytes} from "@eth-optimism/contracts-bedrock/src/libraries/Bytes.sol";
import {SecureMerkleTrie} from "./SecureMerkleTrie.sol";
import "./EVMFetcherDefs.sol";

struct StateProof {
    bytes stateTrieWitness;         // Witness proving the `storageRoot` against a state root.
    bytes[] storageProofs;          // An array of proofs of individual storage elements 
}

library EVMProofHelper {
    using Bytes for bytes;

    error UnknownOpcode(uint8);
    //error InvalidSlotSize(uint256 size);

    /**
     * @notice Convert bytes to uint256 using value semantics (left-aligned and truncated)
     */
    function uint256FromBytes(bytes memory v) internal pure returns (uint256) {
        // bytes32(abi.encodePacked(hex"42")) = 0x4200..0000
        // uint256FromBytes(hex"42")          = 0x0000..0042
        return uint256(v.length < 32 ? bytes32(v) >> ((32 - v.length) << 3) : bytes32(v));
    }

    /**
     * @notice Prove whether the provided storage slot is part of the storageRoot
     * @param target address to verify against
     * @param getter function to verify the storage proof
     * @param storageRoot the storage root for the account that contains the storage slot
     * @param slot The storage key we are fetching the value of
     * @param witness the StorageProof struct containing the necessary proof data
     * @return The retrieved storage proof value or 0x if the storage slot is empty
     */
    function getSingleStorageProof(
        address target,
        function(address,uint256,bytes memory, bytes32) internal view returns(bytes memory) getter,
        bytes32 storageRoot,
        uint256 slot,
        bytes memory witness
    ) private view returns (bytes memory) {
        return getter(
            target,
            slot,
            witness,
            storageRoot
        );
    }

    function getFixedValue(
        address target,
        function(address,uint256,bytes memory, bytes32) internal view returns(bytes memory) getter,
        bytes32 storageRoot, uint256 slot, bytes memory witness
    ) private view returns(bytes32) {
        bytes memory value = getSingleStorageProof(target, getter, storageRoot, slot, witness);
        // RLP encoded storage slots are stored without leading 0 bytes.
        // Casting to bytes32 appends trailing 0 bytes, so we have to bit shift to get the 
        // original fixed-length representation back.
        return bytes32(value) >> (256 - 8 * value.length);
    }

    function computeFirstSlot(bytes32 command, bytes[] memory constants, bytes[] memory values) internal pure returns(bool isDynamic, uint256 slot) {
        uint8 flags = uint8(command[0]);
        isDynamic = (flags & FLAG_DYNAMIC) != 0;
        for (uint256 j = 1; j < 32; j += 1) {
            uint8 op = uint8(command[j]);
            if (op == OP_END) break;
            uint8 opcode  = op & 0xE0; // upper 3
            uint8 operand = op & 0x1F; // lower 5
            if (opcode == OP_FOLLOW_CONST) { // jump through mapping using provided key
                slot = uint256(keccak256(abi.encodePacked(constants[operand], slot)));
            } else if (opcode == OP_FOLLOW_REF) { // jump through mapping using computed key
                slot = uint256(keccak256(abi.encodePacked(values[operand], slot)));
            } else if (opcode == OP_ADD_CONST) { // increment slot by provided amount
                // TODO this could be unchecked to support subtraction (via wrap)
                slot += uint256FromBytes(constants[operand]);
            } else {
                revert UnknownOpcode(op);
            }
        }
    }

    function getDynamicValue(
        address target,
        function(address,uint256,bytes memory, bytes32) internal view returns(bytes memory) getter,
        bytes32 storageRoot, uint256 slot, bytes[] memory proof, uint256 proofIdx) private view returns(bytes memory value, uint256 newProofIdx
    ) {
        uint256 firstValue = uint256(getFixedValue(target, getter, storageRoot, slot, proof[proofIdx++]));
        if(firstValue & 0x01 == 0x01) {
            // Long value: first slot is `length * 2 + 1`, following slots are data.
            slot = uint256(keccak256(abi.encodePacked(slot)));
            value = new bytes(firstValue >> 1);
			uint256 off;
			while (off < value.length) {
				off += 32;
				bytes32 temp = getFixedValue(target, getter, storageRoot, slot++, proof[proofIdx++]);
				assembly { mstore(add(value, off), temp) }
			}
            return (value, proofIdx);
        } else {
            // Short value: least significant byte is `length * 2`, other bytes are data.
            uint256 length = (firstValue & 0xFF) >> 1;
            return (abi.encode(firstValue).slice(0, length), proofIdx);
        }
    }

    function getStorageValues(
        address target,
        function(address,uint256,bytes memory, bytes32) internal view returns(bytes memory) getter,
        bytes32[] memory commands, bytes[] memory constants, bytes32 storageRoot, bytes[] memory proof) internal view returns(bytes[] memory values
    ) {
        uint256 proofIdx = 0;
        values = new bytes[](commands.length);
        for(uint256 i = 0; i < commands.length; i++) {
            bytes32 command = commands[i];
            (bool isDynamic, uint256 slot) = computeFirstSlot(command, constants, values);
            if(!isDynamic) {
                values[i] = abi.encode(getFixedValue(target, getter, storageRoot, slot, proof[proofIdx++]));
			} else {
                (values[i], proofIdx) = getDynamicValue(target, getter, storageRoot, slot, proof, proofIdx);
            }
        }
    }
}