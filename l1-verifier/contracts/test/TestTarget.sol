// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { EVMFetcher } from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import { IEVMVerifier } from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';

contract TestTarget is EVMFetcher {
    IEVMVerifier verifier;      // Slot 0
    uint256 testUint;           // Slot 1

    constructor(IEVMVerifier _verifier) {
        verifier = _verifier;
        testUint = 42;
    }

    function getTestUint() public view returns(uint256) {
        bytes32[][] memory paths = new bytes32[][](1);
        paths[0] = new bytes32[](1);
        paths[0][0] = bytes32(uint256(1));

        getStorageSlots(verifier, address(this), paths, this.getSingleStorageSlotCallback.selector, "");
    }

    function getSingleStorageSlotCallback(bytes[] memory values, bytes memory) public pure returns(uint256) {
        return uint256(bytes32(values[0]));
    }
}