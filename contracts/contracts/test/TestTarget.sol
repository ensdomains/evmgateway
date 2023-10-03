// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { L1Verifier } from '../../contracts/L1Verifier.sol';

error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);

interface L1Gateway {
    function getStorageSlots(address addr, bytes32[][] memory paths) external view returns(bytes memory rootWitness, bytes memory storageWitness);
}

contract TestTarget {
    string[] gatewayURLs;       // Slot 0
    uint256 testUint;           // Slot 1

    constructor(string[] memory _gatewayURLs) {
        gatewayURLs = _gatewayURLs;
        testUint = 42;
    }

    function getTestUint() public view returns(uint256) {
        bytes32[][] memory paths = new bytes32[][](1);
        paths[0] = new bytes32[](1);
        paths[0][0] = bytes32(uint256(1));

        revert OffchainLookup(
            address(this),
            gatewayURLs,
            abi.encodeWithSelector(L1Gateway.getStorageSlots.selector, address(this), paths),
            this.getSingleStorageSlotCallback.selector,
            abi.encode(paths)
        );
    }

    function getSingleStorageSlotCallback(bytes calldata response, bytes calldata extraData) public view returns(uint256) {
        bytes memory proof = abi.decode(response, (bytes));
        bytes32[][] memory paths = abi.decode(extraData, (bytes32[][]));
        bytes[] memory values = L1Verifier.getStorageValues(address(this), paths, proof);
        require(values.length == paths.length, "Invalid number of values");
        return uint256(bytes32(values[0]));
    }
}