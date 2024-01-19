//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IEVMGateway {

    struct EVMTargetRequest {
        address target;
        bytes32[] commands;
        bytes[] constants;
        uint256 operationIdx;
    }

    function getStorageSlots(EVMTargetRequest[] memory tRequests) external pure returns(bytes memory witness);
}