// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface ITargetResolver{
    function setTarget(
        bytes32 node, address target
    ) external;

    function getTarget(
        bytes memory name,uint256 offset
    ) external view returns (bytes32 node, address target);
}
