// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { EVMFetcher, DYNAMIC_MASK } from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import { IEVMVerifier } from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';

contract TestTarget is EVMFetcher {
    IEVMVerifier verifier;                  // Slot 0
    uint256 latest;                         // Slot 1
    string name;                            // Slot 2
    mapping(uint256=>uint256) highscores;   // Slot 3
    mapping(uint256=>string) highscorers;   // Slot 4
    mapping(string=>string) realnames;      // Slot 5

    constructor(IEVMVerifier _verifier) {
        verifier = _verifier;

        latest = 42;
        name = "Vitalik Buterin";
        highscores[latest] = 12345;
        highscorers[latest] = "Hal Finney";
        highscorers[1] = "Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.";
        realnames["satoshi"] = "Hal Finney";
    }

    function getLatest() public view returns(uint256) {
        bytes32[][] memory paths = new bytes32[][](1);
        paths[0] = new bytes32[](1);
        paths[0][0] = bytes32(uint256(1));

        getStorageSlots(verifier, address(this), paths, this.getLatestCallback.selector, "");
    }

    function getLatestCallback(bytes[] memory values, bytes memory) public pure returns(uint256) {
        return uint256(bytes32(values[0]));
    }

    function getName() public view returns(string memory) {
        bytes32[][] memory paths = new bytes32[][](1);
        paths[0] = new bytes32[](1);
        paths[0][0] = DYNAMIC_MASK | bytes32(uint256(2));

        getStorageSlots(verifier, address(this), paths, this.getNameCallback.selector, "");
    }

    function getNameCallback(bytes[] memory values, bytes memory) public pure returns(string memory) {
        return string(values[0]);
    }

    function getHighscorer(uint256 idx) public view returns(string memory) {
        bytes32[][] memory paths = new bytes32[][](1);
        paths[0] = new bytes32[](2);
        paths[0][0] = DYNAMIC_MASK | bytes32(uint256(4));
        paths[0][1] = bytes32(idx);

        getStorageSlots(verifier, address(this), paths, this.getNameCallback.selector, "");
    }

    function getHighscorerCallback(bytes[] memory values, bytes memory) public pure returns(string memory) {
        return string(values[0]);
    }
}