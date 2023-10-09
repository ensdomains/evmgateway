// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { EVMFetcher } from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import { EVMFetchTarget } from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import { IEVMVerifier } from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';

contract TestTarget is EVMFetchTarget {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;

    IEVMVerifier verifier;                  // Slot 0
    uint256 latest;                         // Slot 1
    string name;                            // Slot 2
    mapping(uint256=>uint256) highscores;   // Slot 3
    mapping(uint256=>string) highscorers;   // Slot 4
    mapping(string=>string) realnames;      // Slot 5

    constructor(IEVMVerifier _verifier) {
        verifier = _verifier;

        latest = 42;
        name = "Satoshi";
        highscores[latest] = 12345;
        highscorers[latest] = "Hal Finney";
        highscorers[1] = "Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.";
        realnames["Money Skeleton"] = "Vitalik Buterin";
        realnames["Satoshi"] = "Hal Finney";
    }

    function getLatest() public view returns(uint256) {
        EVMFetcher.newFetchRequest(verifier, address(this))
            .getStatic(1)
            .fetch(this.getLatestCallback.selector, "");
    }

    function getLatestCallback(bytes[] memory values, bytes memory) public pure returns(uint256) {
        return abi.decode(values[0], (uint256));
    }

    function getName() public view returns(string memory) {
        EVMFetcher.newFetchRequest(verifier, address(this))
            .getDynamic(2)
            .fetch(this.getNameCallback.selector, "");
    }

    function getNameCallback(bytes[] memory values, bytes memory) public pure returns(string memory) {
        return string(values[0]);
    }

    function getHighscorer(uint256 idx) public view returns(string memory) {
        EVMFetcher.newFetchRequest(verifier, address(this))
            .getDynamic(4)
                .element(idx)
            .fetch(this.getHighscorerCallback.selector, "");
    }

    function getHighscorerCallback(bytes[] memory values, bytes memory) public pure returns(string memory) {
        return string(values[0]);
    }

    function getLatestHighscore() public view returns(uint256) {
        EVMFetcher.newFetchRequest(verifier, address(this))
            .getStatic(1)
            .getStatic(3)
                .ref(0)
            .fetch(this.getLatestHighscoreCallback.selector, "");
    }

    function getLatestHighscoreCallback(bytes[] memory values, bytes memory) public pure returns(uint256) {
        return abi.decode(values[1], (uint256));
    }

    function getLatestHighscorer() public view returns(string memory) {
        EVMFetcher.newFetchRequest(verifier, address(this))
            .getStatic(1)
            .getDynamic(4)
                .ref(0)
            .fetch(this.getLatestHighscorerCallback.selector, "");
    }

    function getLatestHighscorerCallback(bytes[] memory values, bytes memory) public pure returns(string memory) {
        return string(values[1]);
    }

    function getNickname(string memory _name) public view returns(string memory) {
        EVMFetcher.newFetchRequest(verifier, address(this))
            .getDynamic(5)
                .element(_name)
            .fetch(this.getNicknameCallback.selector, "");
    }

    function getNicknameCallback(bytes[] memory values, bytes memory) public pure returns (string memory) {
        return string(values[0]);
    }

    function getPrimaryNickname() public view returns(string memory) {
        EVMFetcher.newFetchRequest(verifier, address(this))
            .getDynamic(2)
            .getDynamic(5)
                .ref(0)
            .fetch(this.getPrimaryNicknameCallback.selector, "");
    }

    function getPrimaryNicknameCallback(bytes[] memory values, bytes memory) public pure returns (string memory) {
        return string(values[1]);
    }
}