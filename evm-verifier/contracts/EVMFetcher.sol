//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { IEVMVerifier } from './IEVMVerifier.sol';
import { EVMFetchTarget } from './EVMFetchTarget.sol';
import { Address } from '@openzeppelin/contracts/utils/Address.sol';

interface IEVMGateway {
    function getStorageSlots(address addr, bytes[][] memory paths) external pure returns(bytes memory witness);
}

uint256 constant DYNAMIC_MASK = 0x8000000000000000000000000000000000000000000000000000000000000000;
uint256 constant MAGIC_SLOT = 0xd3b7df68fbfff5d2ac8f3603e97698b8e10d49e5cc92d1c72514f593c17b2229;

/**
 * @dev A library to facilitate requesting storage data proofs from contracts, possibly on a different chain.
 *      See l1-verifier/test/TestL1.sol for example usage.
 */
library EVMFetcher {
    uint256 constant MAX_PATH_LENGTH = 4;
    uint256 constant MAX_REQUESTS = 8;

    using Address for address;

    error TooManyRequests(uint256 max);
    error PathTooLong(uint256 request, uint256 max);
    error InvalidReference(uint256 value, uint256 max);
    error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);

    struct EVMFetchRequest {
        IEVMVerifier verifier;
        address target;
        bytes[][] paths;
    }

    /**
     * @dev Creates a request to fetch the value of multiple storage slots from a contract via CCIP-Read, possibly from
     *      another chain.
     *      Supports dynamic length values and slot numbers derived from other retrieved values.
     * @param verifier An instance of a verifier contract that can provide and verify the storage slot information.
     * @param target The address of the contract to fetch storage proofs for.
     */
    function newFetchRequest(IEVMVerifier verifier, address target) internal pure returns (EVMFetchRequest memory) {
        bytes[][] memory paths = new bytes[][](MAX_REQUESTS);
        assembly {
            mstore(paths, 0) // Set current array length to 0
        }
        return EVMFetchRequest(verifier, target, paths);
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
        bytes[][] memory paths = request.paths;
        assembly {
            mstore(paths, add(mload(paths), 1)) // Increment array length
        }
        if(request.paths.length > MAX_REQUESTS) {
            revert TooManyRequests(MAX_REQUESTS);
        }
        bytes[] memory path = new bytes[](MAX_PATH_LENGTH);
        path[0] = abi.encode(baseSlot);
        assembly {
            mstore(path, 1) // Set current array length to 1
        }
        request.paths[request.paths.length - 1] = path;
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
        bytes[][] memory paths = request.paths;
        assembly {
            mstore(paths, add(mload(paths), 1)) // Increment array length
        }
        if(request.paths.length > MAX_REQUESTS) {
            revert TooManyRequests(MAX_REQUESTS);
        }
        bytes[] memory path = new bytes[](MAX_PATH_LENGTH);
        path[0] = abi.encode(baseSlot | DYNAMIC_MASK);
        assembly {
            mstore(path, 1) // Set current array length to 1
        }
        request.paths[request.paths.length - 1] = path;
        return request;
    }

    /**
     * @dev Adds a `uint256` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, uint256 el) internal pure returns (EVMFetchRequest memory) {
        bytes[] memory path = request.paths[request.paths.length - 1];
        assembly {
            mstore(path, add(mload(path), 1)) // Increment array length
        }
        if(path.length > MAX_PATH_LENGTH) {
            revert PathTooLong(request.paths.length - 1, MAX_PATH_LENGTH);
        }
        path[path.length - 1] = abi.encode(el);
        return request;
    }

    /**
     * @dev Adds a `bytes32` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, bytes32 el) internal pure returns (EVMFetchRequest memory) {
        bytes[] memory path = request.paths[request.paths.length - 1];
        assembly {
            mstore(path, add(mload(path), 1)) // Increment array length
        }
        if(path.length > MAX_PATH_LENGTH) {
            revert PathTooLong(request.paths.length - 1, MAX_PATH_LENGTH);
        }
        path[path.length - 1] = abi.encode(el);
        return request;
    }

    /**
     * @dev Adds an `address` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, address el) internal pure returns (EVMFetchRequest memory) {
        bytes[] memory path = request.paths[request.paths.length - 1];
        assembly {
            mstore(path, add(mload(path), 1)) // Increment array length
        }
        if(path.length > MAX_PATH_LENGTH) {
            revert PathTooLong(request.paths.length - 1, MAX_PATH_LENGTH);
        }
        path[path.length - 1] = abi.encode(el);
        return request;
    }

    /**
     * @dev Adds a `bytes` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, bytes memory el) internal pure returns (EVMFetchRequest memory) {
        bytes[] memory path = request.paths[request.paths.length - 1];
        assembly {
            mstore(path, add(mload(path), 1)) // Increment array length
        }
        if(path.length > MAX_PATH_LENGTH) {
            revert PathTooLong(request.paths.length - 1, MAX_PATH_LENGTH);
        }
        path[path.length - 1] = el;
        return request;
    }

    /**
     * @dev Adds a `string` element to the current path.
     * @param request The request object being operated on.
     * @param el The element to add.
     */
    function element(EVMFetchRequest memory request, string memory el) internal pure returns (EVMFetchRequest memory) {
        bytes[] memory path = request.paths[request.paths.length - 1];
        assembly {
            mstore(path, add(mload(path), 1)) // Increment array length
        }
        if(path.length > MAX_PATH_LENGTH) {
            revert PathTooLong(request.paths.length - 1, MAX_PATH_LENGTH);
        }
        path[path.length - 1] = bytes(el);
        return request;
    }

    /**
     * @dev Adds a reference to a previous fetch to the current path.
     * @param request The request object being operated on.
     * @param idx The index of the previous fetch request, starting at 0.
     */
    function ref(EVMFetchRequest memory request, uint256 idx) internal pure returns (EVMFetchRequest memory) {
        bytes[] memory path = request.paths[request.paths.length - 1];
        assembly {
            mstore(path, add(mload(path), 1)) // Increment array length
        }
        if(path.length > MAX_PATH_LENGTH) {
            revert PathTooLong(request.paths.length - 1, MAX_PATH_LENGTH);
        }
        path[path.length - 1] = abi.encode(idx + MAGIC_SLOT);
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
        revert OffchainLookup(
            address(this),
            request.verifier.gatewayURLs(),
            abi.encodeCall(IEVMGateway.getStorageSlots, (request.target, request.paths)),
            EVMFetchTarget.getStorageSlotsCallback.selector,
            abi.encode(request.verifier, request.target, request.paths, callbackId, callbackData)
        );
    }

}
