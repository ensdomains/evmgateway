// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {EVMFetcher} from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import {EVMFetchTarget} from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';

contract MockTestL1 is EVMFetchTarget {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;

    IEVMVerifier verifier; // Slot 0
    address target;

    constructor(IEVMVerifier _verifier, address _target) {
        verifier = _verifier;
        target = _target;
    }

    function getLatest()
        public
        view
        returns (EVMFetcher.EVMFetchRequest memory)
    {
        return EVMFetcher.newFetchRequest(verifier, target).getStatic(0);
    }

    function getName() public view returns (EVMFetcher.EVMFetchRequest memory) {
        return EVMFetcher.newFetchRequest(verifier, target).getDynamic(1);
    }

    function getHighscorer(
        uint256 idx
    ) public view returns (EVMFetcher.EVMFetchRequest memory) {
        return
            EVMFetcher.newFetchRequest(verifier, target).getDynamic(3).element(
                idx
            );
    }

    function getLatestHighscore()
        public
        view
        returns (EVMFetcher.EVMFetchRequest memory)
    {
        return
            EVMFetcher
                .newFetchRequest(verifier, target)
                .getStatic(0)
                .getStatic(2)
                .ref(0);
    }

    function getLatestHighscorer()
        public
        view
        returns (EVMFetcher.EVMFetchRequest memory)
    {
        return
            EVMFetcher
                .newFetchRequest(verifier, target)
                .getStatic(0)
                .getDynamic(3)
                .ref(0);
    }

    function getNickname(
        string memory _name
    ) public view returns (EVMFetcher.EVMFetchRequest memory) {
        return
            EVMFetcher.newFetchRequest(verifier, target).getDynamic(4).element(
                _name
            );
    }

    function getPrimaryNickname()
        public
        view
        returns (EVMFetcher.EVMFetchRequest memory)
    {
        return
            EVMFetcher
                .newFetchRequest(verifier, target)
                .getDynamic(1)
                .getDynamic(4)
                .ref(0);
    }

    function getZero() public view returns (EVMFetcher.EVMFetchRequest memory) {
        return EVMFetcher.newFetchRequest(verifier, target).getStatic(5);
    }
}
