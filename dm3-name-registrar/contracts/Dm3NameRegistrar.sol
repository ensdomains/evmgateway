// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract Dm3NameRegistrar {
    mapping(address => string) public name;
    mapping(bytes32 => address) public reverseRecord;

    event NameRegistered(address indexed addr, string name);

    function register(string calldata _name) external {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(reverseRecord[keccak256(bytes(_name))] == address(0), "Name already registered");
        require(bytes(name[msg.sender]).length == 0, "Address already registered");

        name[msg.sender] = _name;
        reverseRecord[keccak256(bytes(_name))] = msg.sender;

        emit NameRegistered(msg.sender, _name);
    }
}
