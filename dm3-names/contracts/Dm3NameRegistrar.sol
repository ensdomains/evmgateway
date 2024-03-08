// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract Dm3NameRegistrar {
    mapping(bytes32 => address) public owner;
    mapping(address => string) public name;

    event NameRegistered(address indexed addr, string name);

    function register(string calldata _name) external {
        string memory oldName = name[msg.sender];

        if(bytes(oldName).length > 0) {
         //Clear name
            delete owner[keccak256(bytes(oldName))];
        }
        name[msg.sender] = _name;
        owner[keccak256(bytes(_name))] = msg.sender;

        emit NameRegistered(msg.sender, _name);
    }
}
