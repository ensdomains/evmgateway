// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IAddrSetter{
    function setAddr(bytes32 node, address addr) external view;
}

