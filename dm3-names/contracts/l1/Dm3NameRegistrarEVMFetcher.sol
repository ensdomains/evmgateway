// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {EVMFetcher} from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import {EVMFetchTarget} from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import {BytesUtils} from '@ensdomains/ens-contracts/contracts/dnssec-oracle/BytesUtils.sol';
import {IAddrResolver} from '@ensdomains/ens-contracts/contracts/resolvers/profiles/IAddrResolver.sol';
import {ITextResolver} from '@ensdomains/ens-contracts/contracts/resolvers/profiles/ITextResolver.sol';
import {INameResolver} from '@ensdomains/ens-contracts/contracts/resolvers/profiles/INameResolver.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './strings.sol';

contract Dm3NameRegistrarEVMFetcher is EVMFetchTarget, Ownable {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;
    using BytesUtils for bytes;
    using strings for *;

    IEVMVerifier public verifier;
    address public target;
    string public parentDomain;

    uint256 private constant PARENT_NODE_SLOT = 0;
    uint256 private constant OWNER_SLOT = 1;
    uint256 private constant REVERSE_SLOT = 2;
    uint256 private constant TEXTS_SLOT = 3;

    //TODO add OZ ownable
    constructor(
        IEVMVerifier _verifier,
        address _target,
        string memory _parentDomain
    ) {
        verifier = _verifier;
        target = _target;
        parentDomain = _parentDomain;
    }

    function setVerifier(IEVMVerifier _verifier) external onlyOwner {
        verifier = _verifier;
    }

    function setTarget(address _target) external onlyOwner {
        target = _target;
    }
    function setParentDomain(string memory _parentDomain) external onlyOwner {
        parentDomain = _parentDomain;
    }

    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view returns (bytes memory result) {
        bytes4 selector = bytes4(data);

        if (selector == INameResolver.name.selector) {
            bytes32 node = abi.decode(data[4:], (bytes32));
            return _name(node);
        }
        if (selector == ITextResolver.text.selector) {
            (bytes32 node, string memory key) = abi.decode(
                data[4:],
                (bytes32, string)
            );
            return bytes(_text(node, key));
        }
        if (selector == IAddrResolver.addr.selector) {
            bytes32 node = abi.decode(data[4:], (bytes32));
            return _addr(node);
        }
    }
    function _addr(bytes32 node) private view returns (bytes memory) {
        EVMFetcher
            .newFetchRequest(verifier, target)
            .getStatic(OWNER_SLOT)
            .element(node)
            .fetch(this.addrCallback.selector, '');
    }
    function _name(bytes32 node) private view returns (bytes memory) {
        EVMFetcher
            .newFetchRequest(verifier, target)
            .getStatic(PARENT_NODE_SLOT)
            .getDynamic(REVERSE_SLOT)
            .element(node)
            .fetch(this.nameCallback.selector, '');
    }
    function _text(
        bytes32 node,
        string memory key
    ) private view returns (bytes memory) {
        EVMFetcher
            .newFetchRequest(verifier, target)
            .getDynamic(TEXTS_SLOT)
            .element(node)
            .element(key)
            .fetch(this.textCallback.selector, '');
    }

    function textCallback(
        bytes[] memory values,
        bytes memory
    ) public pure returns (bytes memory) {
        return abi.encode(string(values[0]));
    }
    function nameCallback(
        bytes[] memory values,
        bytes memory
    ) public view returns (bytes memory) {
        strings.slice[] memory s = new strings.slice[](3);
        //The label i.e alice
        s[0] = string(values[1]).toSlice();
        //Separator
        s[1] = '.'.toSlice();
        //The parent domain i.e example.com
        s[2] = parentDomain.toSlice();
        return abi.encode(''.toSlice().join(s));
    }
    function addrCallback(
        bytes[] memory values,
        bytes memory
    ) public pure returns (bytes memory) {
        return abi.encode(address(uint160(uint256(bytes32(values[0])))));
    }
}
