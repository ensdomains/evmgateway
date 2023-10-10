//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IEVMVerifier {
    function gatewayURLs() external view returns(string[] memory);
    function getStorageValues(address target, bytes32[] memory commands, bytes[] memory constants, bytes memory proof) external view returns(bytes[] memory values);
}
