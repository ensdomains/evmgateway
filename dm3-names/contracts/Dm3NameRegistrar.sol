// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
import {BytesUtils} from "@ensdomains/ens-contracts/contracts/wrapper/BytesUtils.sol";


contract Dm3NameRegistrar {
    using BytesUtils for bytes;


    mapping(bytes32 => address) public owner;
    mapping(address => bytes) public name;

    event NameRegistered(address indexed addr, bytes name);

    function register(bytes calldata _name) external {
        bytes memory oldName = name[msg.sender];
        if(_name.length == 0) {
            //Clear name
            delete owner[bytes(oldName).namehash(0)];
            delete name[msg.sender];
            return;
        }

        if(bytes(oldName).length > 0) {
         //Clear name
            delete owner[bytes(oldName).namehash(0)];
        }
        name[msg.sender] = _name;
        owner[_name.namehash(0)] = msg.sender;

        emit NameRegistered(msg.sender, _name);
    }
}
