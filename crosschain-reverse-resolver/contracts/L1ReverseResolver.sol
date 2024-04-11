// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {EVMFetcher} from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import {EVMFetchTarget} from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/INameResolver.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/ITextResolver.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@ensdomains/ens-contracts/contracts/utils/HexUtils.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/IExtendedResolver.sol";
import "./IDefaultReverseResolver.sol";

contract L1ReverseResolver is EVMFetchTarget, IExtendedResolver, ERC165 {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;
    IEVMVerifier immutable verifier;
    address immutable target;
    IDefaultReverseResolver immutable defaultReverseResolver;
    uint256 constant VERSIONABLE_TEXTS_SLOT = 1;
    uint256 constant VERSIONABLE_NAME_SLOT = 2;
    uint256 constant RECORD_VERSIONS_SLOT = 3;
    uint256 constant ADDRESS_LENGTH = 40;
    using HexUtils for bytes;

    constructor(IEVMVerifier _verifier, address _target, IDefaultReverseResolver _defaultReverseResolver ) {
        verifier = _verifier;
        target = _target;
        defaultReverseResolver = _defaultReverseResolver;
    }

    /** 
     * @dev Resolve and verify a record stored in l2 target address. It supports fallback to the default resolver
     * @param name DNS encoded ENS name to query
     * @param data The actual calldata
     * @return result result of the call
     */
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory result) {
        bytes4 selector = bytes4(data);
        (address addr,) = HexUtils.hexToAddress(name, 1, ADDRESS_LENGTH + 1);
        if (selector == INameResolver.name.selector) {
            (bytes32 node) = abi.decode(data[4:], (bytes32));
            return bytes(_name(node, addr));
        }
        if (selector == ITextResolver.text.selector) {
            (bytes32 node, string memory key) = abi.decode(data[4:], (bytes32, string));
            return bytes(_text(node, key, addr));
        }
    }

    function _name(bytes32 node, address addr) private view returns (string memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(RECORD_VERSIONS_SLOT)
              .element(node)
            .getDynamic(VERSIONABLE_NAME_SLOT)
              .ref(0)
              .element(node)
            .fetch(this.nameCallback.selector, abi.encode(addr));
    }

    function nameCallback(
        bytes[] memory values,
        bytes memory callbackdata
    ) public view returns (string memory) {        
        if (values[1].length == 0 ) {
            (address addr) = abi.decode(callbackdata, (address));
            return defaultReverseResolver.name(addr);
        } else {
            return string(values[1]);
        }
    }

    function _text(
        bytes32 node,
        string memory key,
        address addr
    ) private view returns (string memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(RECORD_VERSIONS_SLOT)
              .element(node)
            .getDynamic(VERSIONABLE_TEXTS_SLOT)
              .ref(0)
              .element(node)
              .element(key)
            .fetch(this.textCallback.selector, abi.encode(addr, key));
    }

    function textCallback(
        bytes[] memory values,
        bytes memory callbackdata
    ) public view returns (string memory) {
        if (values[1].length == 0 ) {
            (address addr, string memory key) = abi.decode(callbackdata, (address, string));
            return defaultReverseResolver.text(addr, key);
        } else {
            return string(values[1]);
        }
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public override view returns (bool) {
        return
            interfaceId == type(IExtendedResolver).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
