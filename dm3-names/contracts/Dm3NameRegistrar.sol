// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IAddrResolver} from '@ensdomains/ens-contracts/contracts/resolvers/profiles/IAddrResolver.sol';
import {INameResolver} from '@ensdomains/ens-contracts/contracts/resolvers/profiles/INameResolver.sol';
import {ITextResolver} from '@ensdomains/ens-contracts/contracts/resolvers/profiles/ITextResolver.sol';

/// @title Dm3NameRegistrar
/// @notice This contract is used for registering names in the ENS system. It is a combination of ENSResolver and ReverseRegistrar contracts. Allowing to register names and set text records for each name. By beeing compatible with ENSResolver and ReverseRegistrar

contract Dm3NameRegistrar is IAddrResolver, INameResolver, ITextResolver {
    //Lookup table for hexadecimal conversion
    //Taken from ENS ReverseRegistrar contract
    //https://github.com/ensdomains/ens-contracts/blob/21736916300b26cb8ea1802dbf6c9ff054adaeab/contracts/reverseRegistrar/ReverseRegistrar.sol#L12
    bytes32 private constant lookup =
        0x3031323334353637383961626364656600000000000000000000000000000000;

    // Constant for reverse node address
    //Taken from ENS ReverseRegistrar contract
    //https://github.com/ensdomains/ens-contracts/blob/21736916300b26cb8ea1802dbf6c9ff054adaeab/contracts/reverseRegistrar/ReverseRegistrar.sol#L12
    bytes32 private constant ADDR_REVERSE_NODE =
        0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;

    //Node of the L1 domain. in case of OP name that would be namehash(op.dm3.eth)
    //Is not immutable so it can be retrieved from the storage using CCIP
    bytes32 public PARENT_NODE;

    // Mapping to store the owner of each node
    mapping(bytes32 => address) public owner;

    // Mapping to store the reverse record of each node
    mapping(bytes32 => string) public reverse;

    // Mapping to store text records for each node
    mapping(bytes32 => mapping(string => string)) public texts;

    // Event emitted when a name is registered
    event NameRegistered(address indexed addr, string indexed name);

    // Event emitted when a name is removed
    event NameRemoved(address indexed addr, string indexed name);

    /// @notice Constructor to set the parent node
    /// @param _parentNode The parent node of the ENS
    constructor(bytes32 _parentNode) {
        PARENT_NODE = _parentNode;
    }

    /// @notice Register a name in the ENS system
    /// @param _name The name to register
    function register(string calldata _name) external {
        string memory oldName = reverse[makeReverseNode(msg.sender)];
        if (bytes(_name).length == 0) {
            // Clear name if the new name is empty
            delete owner[makeLabelNode(oldName)];
            delete reverse[makeReverseNode(msg.sender)];
            emit NameRemoved(msg.sender, oldName);
            return;
        }

        if (bytes(oldName).length > 0) {
            // Clear old name if it exists
            delete owner[makeLabelNode(oldName)];
            emit NameRemoved(msg.sender, oldName);
        }
        //set owner record
        owner[makeLabelNode(_name)] = msg.sender;
        //set reverse record
        reverse[makeReverseNode(msg.sender)] = _name;
        //emit NameRegistered event
        emit NameRegistered(msg.sender, _name);
    }
    /// @notice Set text for a label
    /// @param label The label to set the text for
    /// @param key The key for the text
    /// @param value The text to set
    function setText(
        bytes32 label,
        string calldata key,
        string calldata value
    ) external {
        address owner = owner[label];
        require(owner != address(0), 'Name not registered');
        require(owner == msg.sender, 'Only owner');
        texts[label][key] = value;
      //  emit TextChanged(node, key, key, value);
    }
    /// @notice Get the address of a node
    /// @param node The node to get the address for
    /// @return The address of the node
    function addr(bytes32 node) external view returns (address payable) {
        return payable(owner[node]);
    }

    /// @notice Get the name of a node
    /// @param node The node to get the name for
    /// @return The name of the node
    function name(bytes32 node) external view returns (string memory) {
        return reverse[node];
    }

    /// @notice Get the text of a node
    /// @param node The node to get the text for
    /// @param key The key for the text
    /// @return The text of the node
    function text(
        bytes32 node,
        string calldata key
    ) external view override returns (string memory) {
        return texts[node][key];
    }
    /// @notice Make a label node using the PARENT_NODE
    /// @param label The label to make a node for
    /// @return The node of the label
    function makeLabelNode(string memory label) private view returns (bytes32) {
        return
            keccak256(abi.encodePacked(PARENT_NODE, keccak256(bytes(label))));
    }
    /// @notice Make a label node used for the reverse record using the ADDR_REVERSE_NODE
    function makeReverseNode(address addr) private pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(ADDR_REVERSE_NODE, sha3HexAddress(addr))
            );
    }

    /// @notice Convert an address to a hexadecimal string and hash it
    /// @param addr The address to convert and hash
    /// @dev taken from ENS ReverseRegistrar contract
    /// @dev https://github.com/ensdomains/ens-contracts/blob/21736916300b26cb8ea1802dbf6c9ff054adaeab/contracts/reverseRegistrar/ReverseRegistrar.sol#L164
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
