// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface ITargetResolver{
    function getTarget(
        bytes memory name
    ) external view returns (bytes32 node, address target);
}
