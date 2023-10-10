//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { IEVMVerifier } from './IEVMVerifier.sol';
import { EVMFetchTarget } from './EVMFetchTarget.sol';
import { Address } from '@openzeppelin/contracts/utils/Address.sol';

interface IEVMGateway {
    function getStorageSlots(address addr, bytes32[] memory commands, bytes[] memory constants) external pure returns(bytes memory witness);
}

uint8 constant FLAG_DYNAMIC = 0x01;
uint8 constant OP_CONSTANT = 0x00;
uint8 constant OP_BACKREF = 0x20;
uint8 constant OP_END = 0xff;

/**
 * @dev A library to facilitate requesting storage data proofs from contracts, possibly on a different chain.
 *      See l1-verifier/test/TestL1.sol for example usage.
 */
library EVMFetcher {
    uint256 constant MAX_COMMANDS = 32;
    uint256 constant MAX_CONSTANTS = 32; // Must not be greater than 32

    using Address for address;

    error TooManyCommands(uint256 max);
    error CommandTooLong();
    error InvalidReference(uint256 value, uint256 max);
    error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);

    struct EVMFetchRequest {
        IEVMVerifier verifier;
        address target;
        bytes32[] commands;
        uint256 operationIdx;
        bytes[] constants;
    }

    /**
     * @dev Creates a request to fetch the value of multiple storage slots from a contract via CCIP-Read, possibly from
     *      another chain.
     *      Supports dynamic length values and slot numbers derived from other retrieved values.
     * @param verifier An instance of a verifier contract that can provide and verify the storage slot information.
     * @param target The address of the contract to fetch storage proofs for.
     */
    function newFetchRequest(IEVMVerifier verifier, address target) internal pure returns (EVMFetchRequest memory) {
        bytes32[] memory commands = new bytes32[](MAX_COMMANDS);
        bytes[] memory constants = new bytes[](MAX_CONSTANTS);
        assembly {
            mstore(commands, 0) // Set current array length to 0
            mstore(constants, 0)
        }        
        return EVMFetchRequest(verifier, target, commands, 0, constants);
    }

    /**
     * @dev Starts describing a new fetch request.
     *      Paths specify a series of hashing operations to derive the final slot ID.
     *      See https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html for details on how Solidity
     *      lays out storage variables.
     * @param request The request object being operated on.
     * @param baseSlot The base slot ID that forms the root of the path.
     */
    function getStatic(EVMFetchRequest memory request, uint256 baseSlot) internal pure returns (EVMFetchRequest memory) {
        bytes32[] memory commands = request.commands;
        uint256 commandIdx = commands.length;
        if(commandIdx > 0 && request.operationIdx < 32) {
            // Terminate previous command
            _addOperation(request, OP_END);
        }
        assembly {
            mstore(commands, add(commandIdx, 1)) // Increment command array length
        }
        if(request.commands.length > MAX_COMMANDS) {
            revert TooManyCommands(MAX_COMMANDS);
        }
        request.operationIdx = 0;
        _addOperation(request, 0);
        _addOperation(request, _addConstant(request, abi.encode(baseSlot)));
        return request;
    }

    /**
     * @dev Starts describing a new fetch request.
     *      Paths specify a series of hashing operations to derive the final slot ID.
     *      See https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html for details on how Solidity
     *      lays out storage variables.
     * @param request The request object being operated on.
     * @param baseSlot The base slot ID that forms the root of the path.
     */
    function getDynamic(EVMFetchRequest memory request, uint256 baseSlot) internal pure returns (EVMFetchRequest memory) {
        bytes32[] memory commands = request.commands;
        uint256 commandIdx = commands.length;
        if(commandIdx > 0 && request.operationIdx < 32) {
            // Terminate previous command
            _addOperation(request, OP_END);
        }
        assembly {
            mstore(commands, add(commandIdx, 1)) // Increment command array length
        }
        if(request.commands.length > MAX_COMMANDS) {
            revert TooManyCommands(MAX_COMMANDS);
        }
        request.operationIdx = 0;
        _addOperation(request, FLAG_DYNAMIC);
        _addOperation(request, _addConstant(request, abi.encode(baseSlot)));
        return request;
    }

    /**
     * @dev Adds a `uint256` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, uint256 el) internal pure returns (EVMFetchRequest memory) {
        if(request.operationIdx >= 32) {
            revert CommandTooLong();
        }
        _addOperation(request, _addConstant(request, abi.encode(el)));
        return request;
    }

    /**
     * @dev Adds a `bytes32` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, bytes32 el) internal pure returns (EVMFetchRequest memory) {
        if(request.operationIdx >= 32) {
            revert CommandTooLong();
        }
        _addOperation(request, _addConstant(request, abi.encode(el)));
        return request;
    }

    /**
     * @dev Adds an `address` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, address el) internal pure returns (EVMFetchRequest memory) {
        if(request.operationIdx >= 32) {
            revert CommandTooLong();
        }
        _addOperation(request, _addConstant(request, abi.encode(el)));
        return request;
    }

    /**
     * @dev Adds a `bytes` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, bytes memory el) internal pure returns (EVMFetchRequest memory) {
        if(request.operationIdx >= 32) {
            revert CommandTooLong();
        }
        _addOperation(request, _addConstant(request, el));
        return request;
    }

    /**
     * @dev Adds a `string` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, string memory el) internal pure returns (EVMFetchRequest memory) {
        if(request.operationIdx >= 32) {
            revert CommandTooLong();
        }
        _addOperation(request, _addConstant(request, bytes(el)));
        return request;
    }

    /**
     * @dev Adds a reference to a previous fetch to the current path.
     * @param request The request object being operated on.
     * @param idx The index of the previous fetch request, starting at 0.
     */
    function ref(EVMFetchRequest memory request, uint8 idx) internal pure returns (EVMFetchRequest memory) {
        if(request.operationIdx >= 32) {
            revert CommandTooLong();
        }
        if(idx > request.commands.length || idx > 31) {
            revert InvalidReference(idx, request.commands.length);
        }
        _addOperation(request, OP_BACKREF | idx);
        return request;
    }

    /**
     * @dev Initiates the fetch request.
     *      Calling this function terminates execution; clients that implement CCIP-Read will make a callback to
     *      `callback` with the results of the operation.
     * @param callbackId A callback function selector on this contract that will be invoked via CCIP-Read with the result of the lookup.
     *        The function must have a signature matching `(bytes[] memory values, bytes callbackData)` with a return type matching the call in which
     *        this function was invoked. Its return data will be returned as the return value of the entire CCIP-read operation.
     * @param callbackData Extra data to supply to the callback.
     */
    function fetch(EVMFetchRequest memory request, bytes4 callbackId, bytes memory callbackData) internal view {
        if(request.commands.length > 0 && request.operationIdx < 32) {
            // Terminate last command
            _addOperation(request, OP_END);
        }
        revert OffchainLookup(
            address(this),
            request.verifier.gatewayURLs(),
            abi.encodeCall(IEVMGateway.getStorageSlots, (request.target, request.commands, request.constants)),
            EVMFetchTarget.getStorageSlotsCallback.selector,
            abi.encode(request.verifier, request.target, request.commands, request.constants, callbackId, callbackData)
        );
    }

    function _addConstant(EVMFetchRequest memory request, bytes memory value) private pure returns(uint8 idx) {
        bytes[] memory constants = request.constants;
        idx = uint8(constants.length);
        assembly {
            mstore(constants, add(idx, 1)) // Increment constant array length
        }
        constants[idx] = value;
    }

    function _addOperation(EVMFetchRequest memory request, uint8 op) private pure {
        uint256 commandIdx = request.commands.length - 1;
        request.commands[commandIdx] = request.commands[commandIdx] | (bytes32(bytes1(op)) >> (8 * request.operationIdx++));
    }
}
