// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {EVMFetcher} from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import {EVMFetchTarget} from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';

contract L1Resolver is EVMFetchTarget {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;
    uint256 private constant COIN_TYPE_ETH = 60;
    IEVMVerifier verifier;
    address target;

    constructor(IEVMVerifier _verifier, address _target) {
        verifier = _verifier;
        target = _target;
    }

    function addr(bytes32 node) public view returns (address) {
        EVMFetcher
            .newFetchRequest(verifier, target)
            .getStatic(1)
            .element(node)
            .getDynamic(3)
            .ref(0)
            .element(node)
            .element(COIN_TYPE_ETH)
            .fetch(this.addrCallback.selector, ''); // recordVersions
    }

    function addrCallback(
        bytes[] memory values,
        bytes memory
    ) public pure returns (address) {
        return bytesToAddress(values[1]);
    }

    function addr(
        bytes32 node,
        uint256 coinType
    ) public view returns (bytes memory) {
        EVMFetcher
            .newFetchRequest(verifier, target)
            .getStatic(1)
            .element(node)
            .getDynamic(3)
            .ref(0)
            .element(node)
            .element(coinType)
            .fetch(this.addrCoinTypeCallback.selector, ''); // recordVersions
    }

    function addrCoinTypeCallback(
        bytes[] memory values,
        bytes memory
    ) public pure returns (bytes memory) {
        return values[1];
    }

    function text(
        bytes32 node,
        string calldata key
    ) public view returns (string memory) {
        EVMFetcher
            .newFetchRequest(verifier, target)
            .getStatic(1)
            .element(node)
            .getDynamic(11)
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

    function contenthash(bytes32 node) public view returns (bytes memory) {
        EVMFetcher
            .newFetchRequest(verifier, target)
            .getStatic(1)
            .element(node)
            .getDynamic(4)
            .ref(0)
            .element(node)
            .fetch(this.contenthashCallback.selector, '');
    }

    function contenthashCallback(
        bytes[] memory values,
        bytes memory
    ) public pure returns (bytes memory) {
        return values[1];
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
