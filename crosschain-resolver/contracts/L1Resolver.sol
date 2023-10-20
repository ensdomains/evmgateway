// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {EVMFetcher} from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import {EVMFetchTarget} from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';

contract L1Resolver is EVMFetchTarget {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;

    IEVMVerifier verifier;
    address target;

    constructor(IEVMVerifier _verifier, address _target) {
        verifier = _verifier;
        target = _target;
    }

    function getAddr(bytes32 node) public view returns (address) {
        EVMFetcher
            .newFetchRequest(verifier, target)
            .getStatic(0)
            .element(node)
            .getDynamic(1)
            .ref(0)
            .element(node)
            .fetch(this.getAddrCallback.selector, ''); // recordVersions
    }

    function getAddrCallback(
        bytes[] memory values,
        bytes memory
    ) public pure returns (address) {
        // return abi.decode(values[1], (address));
        return bytesToAddress(values[1]);
    }

    function bytesToAddress(
        bytes memory b
    ) internal pure returns (address payable a) {
        require(b.length == 20);
        assembly {
            a := div(mload(add(b, 32)), exp(256, 12))
        }
    }
}
