//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { IEVMVerifier } from './IEVMVerifier.sol';
import { EVMFetchTarget } from './EVMFetchTarget.sol';
import { IEVMGateway } from './IEVMGateway.sol';
import { Address } from '@openzeppelin/contracts/utils/Address.sol';

uint8 constant FLAG_STATIC = 0x00;
uint8 constant FLAG_DYNAMIC = 0x01;
uint8 constant OP_CONSTANT = 0x00;
uint8 constant OP_BACKREF = 0x20;
uint8 constant OP_END = 0xff;

/**
 * @dev A library to facilitate requesting storage data proofs from contracts, possibly on a different chain.
 *      See l1-verifier/test/TestL1.sol for example usage.
 */
library EVMFetcher {
    uint256 constant MAX_TARGETS = 32;
    uint256 constant MAX_COMMANDS = 32;
    uint256 constant MAX_CONSTANTS = 32; // Must not be greater than 32

    using Address for address;

    error TooManyCommands(uint256 max);
    error TooManyTargets(uint256 max);
    error CommandTooLong();
    error InvalidReference(uint256 value, uint256 max);
    error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);

    struct EVMFetchRequest {
        IEVMVerifier verifier;
        IEVMGateway.EVMTargetRequest[] tRequests;
    }

    /**
     * @dev Creates a new EVMTargetRequest
     *      Internal helper function for DRY code
     * @param request The request object being operated on.
     * @param target The new target address
     */
    function addNewTargetRequest(EVMFetchRequest memory request, address target) internal pure {

        IEVMGateway.EVMTargetRequest[] memory targetRequests = request.tRequests;
        uint256 targetCount = targetRequests.length;

        bytes32[] memory commands = new bytes32[](MAX_COMMANDS);
        bytes[] memory constants = new bytes[](MAX_CONSTANTS);
        assembly {
            mstore(targetRequests, add(targetCount, 1)) //Set the array length to 1 (for the initial target)
            mstore(commands, 0) // Set current array length to 0
            mstore(constants, 0)
        }        

        if(targetRequests.length > MAX_TARGETS) {
            revert TooManyTargets(MAX_TARGETS);
        }

        targetRequests[targetCount] = IEVMGateway.EVMTargetRequest(target, commands, constants, 0);
    }

    /**
     * @dev Creates a request to fetch the value of multiple storage slots from one or more target contracts
     * via CCIP-Read, possibly from another chain.
     * Supports dynamic length values and slot numbers derived from other retrieved values.
     * @param verifier An instance of a verifier contract that can provide and verify the storage slot information.
     * @param target The address of the contract to fetch storage proofs for.
     */
    function newFetchRequest(IEVMVerifier verifier, address target) internal pure returns (EVMFetchRequest memory) {
        
        //Reserve the space
        IEVMGateway.EVMTargetRequest[] memory targetRequests = new IEVMGateway.EVMTargetRequest[](MAX_TARGETS);

        assembly {
            mstore(targetRequests, 0)
        }       

        //Create the base EVMFetchRequest
        EVMFetchRequest memory request = EVMFetchRequest(verifier, targetRequests);

        //Add a new IEVMGateway.EVMTargetRequest
        addNewTargetRequest(request, target);

        return request;
    }

    /**
     * @dev Initializes a new EVM command for fetching a data value from a target
     *      Internal helper function for DRY code
     * @param request The request object being operated on.
     * @param baseSlot The base slot ID that forms the root of the path.
     * @param flag The command flag specifying if the requested value is housed in a static or dynamic storage slot
     */
    function initNewCommand(EVMFetchRequest memory request, uint256 baseSlot, uint8 flag) internal pure {

        uint256 targetIdx = request.tRequests.length - 1;
        IEVMGateway.EVMTargetRequest memory tRequest = request.tRequests[targetIdx];
        bytes32[] memory commands = tRequest.commands;
        
        uint256 commandIdx = commands.length;
        if(commandIdx > 0 && tRequest.operationIdx < 32) {
            // Terminate previous command
            _addOperation(tRequest, OP_END);
        }
        assembly {
            mstore(commands, add(commandIdx, 1)) // Increment command array length
        }
        if(commands.length > MAX_COMMANDS) {
            revert TooManyCommands(MAX_COMMANDS);
        }

        tRequest.operationIdx = 0;
        _addOperation(tRequest, flag);
        _addOperation(tRequest, _addConstant(tRequest, abi.encode(baseSlot)));
    }

    /**
     * @dev Initialize a command to fetch a data value from a single static storage slot
     *      See https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html for details on how Solidity
     *      lays out storage variables.
     * @param request The request object being operated on.
     * @param baseSlot The base slot ID that forms the root of the path.
     */
    function getStatic(EVMFetchRequest memory request, uint256 baseSlot) internal pure returns (EVMFetchRequest memory) {
        
        initNewCommand(request, baseSlot, FLAG_STATIC);

        return request;
    }

    /**
     * @dev Initialize a command to fetch a dynamic data value from multiple storage slots
     *      subject to the Solidity storage rules
     *      Paths specify a series of hashing operations to derive the final slot ID.
     *      See https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html for details on how Solidity
     *      lays out storage variables.
     * @param request The request object being operated on.
     * @param baseSlot The base slot ID that forms the root of the path.
     */
    function getDynamic(EVMFetchRequest memory request, uint256 baseSlot) internal pure returns (EVMFetchRequest memory) {
        
        initNewCommand(request, baseSlot, FLAG_DYNAMIC);

        return request;
    }

    /**
     * @dev Adds a `uint256` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, uint256 el) internal pure returns (EVMFetchRequest memory) {

        uint256 targetIdx = request.tRequests.length - 1;
        IEVMGateway.EVMTargetRequest memory tRequest = request.tRequests[targetIdx];
        
        if(tRequest.operationIdx >= 32) {
            revert CommandTooLong();
        }
        _addOperation(tRequest, _addConstant(tRequest, abi.encode(el)));

        return request;
    }

    /**
     * @dev Adds a `bytes32` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, bytes32 el) internal pure returns (EVMFetchRequest memory) {

        uint256 targetIdx = request.tRequests.length - 1;
        IEVMGateway.EVMTargetRequest memory tRequest = request.tRequests[targetIdx];
        
        if(tRequest.operationIdx >= 32) {
            revert CommandTooLong();
        }
        _addOperation(tRequest, _addConstant(tRequest, abi.encode(el)));

        return request;
    }

    /**
     * @dev Adds an `address` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, address el) internal pure returns (EVMFetchRequest memory) {

        uint256 targetIdx = request.tRequests.length - 1;
        IEVMGateway.EVMTargetRequest memory tRequest = request.tRequests[targetIdx];
        
        if(tRequest.operationIdx >= 32) {
            revert CommandTooLong();
        }
        _addOperation(tRequest, _addConstant(tRequest, abi.encode(el)));
        return request;
    }

    /**
     * @dev Adds a `bytes` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, bytes memory el) internal pure returns (EVMFetchRequest memory) {

        uint256 targetIdx = request.tRequests.length - 1;
        IEVMGateway.EVMTargetRequest memory tRequest = request.tRequests[targetIdx];
        
        if(tRequest.operationIdx >= 32) {
            revert CommandTooLong();
        }
        _addOperation(tRequest, _addConstant(tRequest, el));
        return request;
    }

    /**
     * @dev Adds a `string` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, string memory el) internal pure returns (EVMFetchRequest memory) {

        uint256 targetIdx = request.tRequests.length - 1;
        IEVMGateway.EVMTargetRequest memory tRequest = request.tRequests[targetIdx];
        
        if(tRequest.operationIdx >= 32) {
            revert CommandTooLong();
        }
        _addOperation(tRequest, _addConstant(tRequest, bytes(el)));
        return request;
    }

    /**
     * @dev Adds a reference to a previous fetch to the current path.
     * @param request The request object being operated on.
     * @param idx The index of the previous fetch request, starting at 0.
     */
    function ref(EVMFetchRequest memory request, uint8 idx) internal pure returns (EVMFetchRequest memory) {

        uint256 targetIdx = request.tRequests.length - 1;
        IEVMGateway.EVMTargetRequest memory tRequest = request.tRequests[targetIdx];

        if(tRequest.operationIdx >= 32) {
            revert CommandTooLong();
        }
        if(idx > tRequest.commands.length || idx > 31) {
            revert InvalidReference(idx, tRequest.commands.length);
        }
        _addOperation(tRequest, OP_BACKREF | idx);
        return request;
    }

    /**
     * @dev Sets the target contract address from which to fetch future requested values
     * @param request The request object being operated on.
     * @param target The target contract address
     */
    function setTarget(EVMFetchRequest memory request, address target) internal pure returns (EVMFetchRequest memory) {

        IEVMGateway.EVMTargetRequest[] memory tRequests = request.tRequests;

        uint256 targetCount = tRequests.length;
        uint256 targetIdx = targetCount - 1;

        //Close off the last command for the previous IEVMGateway.EVMTargetRequest
        IEVMGateway.EVMTargetRequest memory tRequest = request.tRequests[targetIdx];
        bytes32[] memory commands = tRequest.commands;

        if(commands.length > 0 && tRequest.operationIdx < 32) {
            // Terminate last command
            _addOperation(tRequest, OP_END);
        }
        
        //Add a new IEVMGateway.EVMTargetRequest
        addNewTargetRequest(request, target);

        return request;
    }

    /**
     * @dev Sets the target contract address from which to fetch future requested values
     * to an address returned as a value from a previous indexed request
     * @param request The request object being operated on.
     * @param idx The index of the value requested that contains an address to target
     */
    function setTargetRef(EVMFetchRequest memory request, uint8 idx) internal pure returns (EVMFetchRequest memory) {

        address targetAddress = address(uint160(bytes20(bytes1(idx)) >> (152)));
        setTarget(request, targetAddress);

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

        uint256 targetIdx = request.tRequests.length - 1;
        IEVMGateway.EVMTargetRequest memory tRequest = request.tRequests[targetIdx];

        bytes[] memory constants = tRequest.constants;

        if(tRequest.commands.length > 0 && tRequest.operationIdx < 32) {
            // Terminate last command
            _addOperation(tRequest, OP_END);
        }
        
        revert OffchainLookup(
            address(this),
            request.verifier.gatewayURLs(),
            abi.encodeCall(IEVMGateway.getStorageSlots, request.tRequests),
            EVMFetchTarget.getStorageSlotsCallback.selector,
            abi.encode(request.verifier, request.tRequests, callbackId, callbackData)
        );
    }

    function _addConstant(IEVMGateway.EVMTargetRequest memory tRequest, bytes memory value) private pure returns(uint8 idx) {

        bytes[] memory constants = tRequest.constants;

        idx = uint8(constants.length);

        assembly {
            mstore(constants, add(idx, 1)) // Increment constant array length
        }
        constants[idx] = value;
    }

    function _addOperation(IEVMGateway.EVMTargetRequest memory tRequest, uint8 op) private pure {

        uint256 commandIdx = tRequest.commands.length - 1;
        tRequest.commands[commandIdx] = tRequest.commands[commandIdx] | (bytes32(bytes1(op)) >> (8 * tRequest.operationIdx++));
    }
}
