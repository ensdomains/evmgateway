// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {EVMFetcher} from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import {EVMFetchTarget} from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import {BytesUtils} from '@ensdomains/ens-contracts/contracts/dnssec-oracle/BytesUtils.sol';
import {IAddrResolver} from '@ensdomains/ens-contracts/contracts/resolvers/profiles/IAddrResolver.sol';
import {ITextResolver} from '@ensdomains/ens-contracts/contracts/resolvers/profiles/ITextResolver.sol';
import {INameResolver} from '@ensdomains/ens-contracts/contracts/resolvers/profiles/INameResolver.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';

contract Dm3NameRegistrarEVMFetcher is EVMFetchTarget {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;
    using BytesUtils for bytes;

    IEVMVerifier immutable verifier;
    address public target;
    string public parentDomain;

    uint256 private constant TEXTS_SLOT = 3;
    error Debug(address target);

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

    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view returns (bytes memory result) {
        bytes4 selector = bytes4(data);

        // if (selector == IAddrResolver.addr.selector) {
        //     bytes32 node = abi.decode(data[4:], (bytes32));
        //     return _addr(node, target);
        // }
        // if (selector == INameResolver.name.selector) {
        //     bytes32 node = abi.decode(data[4:], (bytes32));
        //     return _name(node, target);
        // }
        if (selector == ITextResolver.text.selector) {
            (bytes32 node, string memory key) = abi.decode(
                data[4:],
                (bytes32, string)
            );
            return bytes(_text(node, key));
        }
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
}
