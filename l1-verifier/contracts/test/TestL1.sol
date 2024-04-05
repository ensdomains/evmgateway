// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { EVMFetcher } from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import { EVMFetchTarget } from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import { IEVMVerifier } from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';

contract TestL1 is EVMFetchTarget {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;

    IEVMVerifier verifier;                  // Slot 0
    address target;
    address target2;

    constructor(IEVMVerifier _verifier, address _target, address _target2) {
        verifier = _verifier;
        target = _target;
        target2 = _target2;
    }

    function getLatest() public view returns(uint256) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(0)
            .fetch(this.getLatestCallback.selector, "");
    }

    function getLatestCallback(bytes[] memory values, bytes memory) public pure returns(uint256) {
        return abi.decode(values[0], (uint256));
    }

    function getSecondAddress() public view returns(address) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(1)
            .fetch(this.getSecondAddressCallback.selector, "");
    }

    function getSecondAddressCallback(bytes[] memory values, bytes memory) public pure returns(address) {
        return abi.decode(values[0], (address));
    }

    function getValueFromSecondContract() public view returns(address) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(1)
                .setTargetRef(0)
            .getStatic(1)   
            .fetch(this.getValueFromSecondContractCallback.selector, "");
    }

    function getValueFromSecondContractCallback(bytes[] memory values, bytes memory) public pure returns(address) {
        return abi.decode(values[1], (address));
    }

    function getLatestFromTwoTargets() public view returns(uint256) {

        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(0)
            .setTarget(target2)
            .getStatic(0)
            .fetch(this.getLatestFromTwoTargetsCallback.selector, "");
    }

    function getLatestFromTwoTargetsCallback(bytes[] memory values, bytes memory) public pure returns(uint256) {
        uint256 l1 = abi.decode(values[0], (uint256));
        uint256 l2 = abi.decode(values[1], (uint256));

        return l1 + l2;
    }

    function getName() public view returns(string memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getDynamic(2)
            .fetch(this.getNameCallback.selector, "");
    }

    function getNameCallback(bytes[] memory values, bytes memory) public pure returns(string memory) {
        return string(values[0]);
    }

    function getHighscorer(uint256 idx) public view returns(string memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getDynamic(4)
                .element(idx)
            .fetch(this.getHighscorerCallback.selector, "");
    }

    function getHighscorerCallback(bytes[] memory values, bytes memory) public pure returns(string memory) {
        return string(values[0]);
    }

    function getLatestHighscore() public view returns(uint256) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(0)
            .getStatic(3)
                .ref(0)
            .fetch(this.getLatestHighscoreCallback.selector, "");
    }

    function getLatestHighscoreCallback(bytes[] memory values, bytes memory) public pure returns(uint256) {
        return abi.decode(values[1], (uint256));
    }

    function getLatestHighscorer() public view returns(string memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(0)
            .getDynamic(4)
                .ref(0)
            .fetch(this.getLatestHighscorerCallback.selector, "");
    }

    function getLatestHighscorerCallback(bytes[] memory values, bytes memory) public pure returns(string memory) {
        return string(values[1]);
    }

    function getNickname(string memory _name) public view returns(string memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getDynamic(5)
                .element(_name)
            .fetch(this.getNicknameCallback.selector, "");
    }

    function getNicknameCallback(bytes[] memory values, bytes memory) public pure returns (string memory) {
        return string(values[0]);
    }

    function getPrimaryNickname() public view returns(string memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getDynamic(2)
            .getDynamic(5)
                .ref(0)
            .fetch(this.getPrimaryNicknameCallback.selector, "");
    }

    function getPrimaryNicknameCallback(bytes[] memory values, bytes memory) public pure returns (string memory) {
        return string(values[1]);
    }

    function getZero() public view returns(uint256) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(6)
            .fetch(this.getZeroCallback.selector, "");
    }

    function getZeroCallback(bytes[] memory values, bytes memory) public pure returns (uint256) {
        return abi.decode(values[0], (uint256));
    }

    function getZeroIndex() public view returns(uint256) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(6)
            .getStatic(3)
                .ref(0)
            .fetch(this.getZeroIndexCallback.selector, "");
    }

    function getZeroIndexCallback(bytes[] memory values, bytes memory) public pure returns(uint256) {
        return abi.decode(values[1], (uint256));
    }
}
