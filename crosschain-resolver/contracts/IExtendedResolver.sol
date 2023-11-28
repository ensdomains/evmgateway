// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IExtendedResolver{
    function resolve(
        bytes calldata name, bytes calldata data
    ) external view returns (bytes memory result);
}
