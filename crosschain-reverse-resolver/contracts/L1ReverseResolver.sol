// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {EVMFetcher} from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import {EVMFetchTarget} from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';

contract L1ReverseResolver is EVMFetchTarget {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;
    IEVMVerifier immutable verifier;
    address immutable target;
    uint256 constant RECORD_VERSIONS_SLOT = 1;
    uint256 constant VERSIONABLE_TEXTS_SLOT = 3;
    uint256 constant VERSIONABLE_NAME_SLOT = 4;

    constructor(IEVMVerifier _verifier, address _target) {
        verifier = _verifier;
        target = _target;
    }

    /**
     * Returns the address associated with an ENS node.
     * @param node The ENS node to query.
     * @return The associated name.
     */
            //  return versionable_names[recordVersions[node]][node];
    function name(bytes32 node) public view returns (string memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(RECORD_VERSIONS_SLOT)
              .element(node)
            .getDynamic(VERSIONABLE_NAME_SLOT)
              .ref(0)
              .element(node)
            .fetch(this.nameCallback.selector, ''); // recordVersions
    }

    function nameCallback(
        bytes[] memory values,
        bytes memory
    ) public pure returns (string memory) {
        return string(values[1]);
    }

    /**
     * Returns the text data associated with an ENS node and key.
     * @param node The ENS node to query.
     * @param key The text data key to query.
     * @return The associated text data.
     */
    function text(
        bytes32 node,
        string calldata key
    ) public view returns (string memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(RECORD_VERSIONS_SLOT)
              .element(node)
            .getDynamic(VERSIONABLE_TEXTS_SLOT)
              .ref(0)
              .element(node)
              .element(key)
            .fetch(this.textCallback.selector, '');
    }

    function textCallback(
        bytes[] memory values,
        bytes memory
    ) public pure returns (string memory) {
        return string(values[1]);
    }
}
