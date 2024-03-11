// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IAddrResolver} from '@ensdomains/ens-contracts/contracts/resolvers/profiles/IAddrResolver.sol';
import {INameResolver} from '@ensdomains/ens-contracts/contracts/resolvers/profiles/INameResolver.sol';

contract Dm3NameRegistrar is IAddrResolver, INameResolver {
    bytes32 private constant lookup =
        0x3031323334353637383961626364656600000000000000000000000000000000;

    bytes32 private constant ADDR_REVERSE_NODE =
        0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;
    bytes32 public PARENT_NODE;

    mapping(bytes32 => address) public owner;
    mapping(bytes32 => string) public reverse;

    event NameRegistered(address indexed addr, string indexed name);

    constructor(bytes32 _parentNode) {
        PARENT_NODE = _parentNode;
    }

    function register(string calldata _name) external {
        string memory oldName = reverse[makeReverseNode(msg.sender)];
        if (bytes(_name).length == 0) {
            //Clear name
            delete owner[makeLabelNode(oldName)];
            delete reverse[makeReverseNode(msg.sender)];
            return;
        }

        if (bytes(oldName).length > 0) {
            //Clear name
            delete owner[makeLabelNode(oldName)];
        }

        owner[makeLabelNode(_name)] = msg.sender;

        //set reverse record
        reverse[makeReverseNode(msg.sender)] = _name;

        emit NameRegistered(msg.sender, _name);
    }

    function addr(bytes32 node) external view returns (address payable) {
        return payable(owner[node]);
    }
    function name(bytes32 node) external view returns (string memory) {
        return reverse[node];
    }
    function makeLabelNode(string memory label) private view returns (bytes32) {
        return
            keccak256(abi.encodePacked(PARENT_NODE, keccak256(bytes(label))));
    }
    function makeReverseNode(address addr) private pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(ADDR_REVERSE_NODE, sha3HexAddress(addr))
            );
    }

    function sha3HexAddress(address addr) private pure returns (bytes32 ret) {
        assembly {
            for {
                let i := 40
            } gt(i, 0) {

            } {
                i := sub(i, 1)
                mstore8(i, byte(and(addr, 0xf), lookup))
                addr := div(addr, 0x10)
                i := sub(i, 1)
                mstore8(i, byte(and(addr, 0xf), lookup))
                addr := div(addr, 0x10)
            }

            ret := keccak256(0, 40)
        }
    }
}
