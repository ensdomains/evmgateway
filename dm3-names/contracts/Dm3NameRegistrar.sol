// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IAddrResolver} from '@ensdomains/ens-contracts/contracts/resolvers/profiles/IAddrResolver.sol';

contract Dm3NameRegistrar is IAddrResolver {
    bytes32 public PARENT_NODE;

    mapping(bytes32 => address) public owner;
    mapping(address => string) public name;

    event NameRegistered(address indexed addr, string indexed name);

    constructor(bytes32 _parentNode) {
        PARENT_NODE = _parentNode;
    }

    function register(string calldata _name) external {
        string memory oldName = name[msg.sender];
        if (bytes(_name).length == 0) {
            //Clear name
            bytes32 labelhash = keccak256(bytes(oldName));
            bytes32 node = _makeNode(PARENT_NODE, labelhash);
            delete owner[node];
            delete name[msg.sender];
            return;
        }

        if (bytes(oldName).length > 0) {
            //Clear name
            bytes32 labelhash = keccak256(bytes(oldName));
            bytes32 node = _makeNode(PARENT_NODE, labelhash);
            delete owner[node];
        }
        bytes32 labelhash = keccak256(bytes(_name));
        bytes32 node = _makeNode(PARENT_NODE, labelhash);
        name[msg.sender] = _name;
        owner[node] = msg.sender;

        emit NameRegistered(msg.sender, _name);
    }

    function addr(bytes32 node) external view returns (address payable) {
        return payable(owner[node]);
    }
    function _makeNode(
        bytes32 node,
        bytes32 labelhash
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(node, labelhash));
    }
}
