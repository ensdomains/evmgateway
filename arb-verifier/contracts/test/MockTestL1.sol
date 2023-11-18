// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {EVMFetcher} from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import {EVMFetchTarget} from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';

uint8 constant OP_END = 0xff;

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
        EVMFetcher.EVMFetchRequest memory req = EVMFetcher
            .newFetchRequest(verifier, target)
            .getStatic(0);

        _addOperation(req, OP_END);

        return req;
    }

    function getName() public view returns (EVMFetcher.EVMFetchRequest memory) {
        EVMFetcher.EVMFetchRequest memory req = EVMFetcher
            .newFetchRequest(verifier, target)
            .getDynamic(1);

        _addOperation(req, OP_END);

        return req;
    }

    function getHighscorer(
        uint256 idx
    ) public view returns (EVMFetcher.EVMFetchRequest memory) {
        EVMFetcher.EVMFetchRequest memory req = EVMFetcher
            .newFetchRequest(verifier, target)
            .getDynamic(3)
            .element(idx);

        _addOperation(req, OP_END);
        return req;
    }

    function getLatestHighscore()
        public
        view
        returns (EVMFetcher.EVMFetchRequest memory)
    {
        EVMFetcher.EVMFetchRequest memory req = EVMFetcher
            .newFetchRequest(verifier, target)
            .getStatic(0)
            .getStatic(2)
            .ref(0);
        _addOperation(req, OP_END);
        return req;
    }

    function getLatestHighscorer()
        public
        view
        returns (EVMFetcher.EVMFetchRequest memory)
    {
        EVMFetcher.EVMFetchRequest memory req = EVMFetcher
            .newFetchRequest(verifier, target)
            .getStatic(0)
            .getDynamic(3)
            .ref(0);

        _addOperation(req, OP_END);
        return req;
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

    function _addOperation(
        EVMFetcher.EVMFetchRequest memory request,
        uint8 op
    ) private pure {
        uint256 commandIdx = request.commands.length - 1;
        request.commands[commandIdx] =
            request.commands[commandIdx] |
            (bytes32(bytes1(op)) >> (8 * request.operationIdx++));
    }
}
