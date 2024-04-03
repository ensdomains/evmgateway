// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IAddrSetter{
    function setAddr(bytes32 node, address addr) external view;
    function resolveDeferral(bytes calldata name, bytes calldata data) external view returns (bytes memory result);
}

