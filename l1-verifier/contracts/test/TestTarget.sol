// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { EVMFetcher, DYNAMIC_MASK, MAGIC_SLOT } from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
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
        bytes[][] memory paths = new bytes[][](1);
        paths[0] = new bytes[](1);
        paths[0][0] = abi.encode(uint256(1));

        getStorageSlots(verifier, address(this), paths, this.getLatestCallback.selector, "");
    }

    function getLatestCallback(bytes[] memory values, bytes memory) public pure returns(uint256) {
        return abi.decode(values[0], (uint256));
    }

    function getName() public view returns(string memory) {
        bytes[][] memory paths = new bytes[][](1);
        paths[0] = new bytes[](1);
        paths[0][0] = abi.encode(DYNAMIC_MASK | bytes32(uint256(2)));

        getStorageSlots(verifier, address(this), paths, this.getNameCallback.selector, "");
    }

    function getNameCallback(bytes[] memory values, bytes memory) public pure returns(string memory) {
        return string(values[0]);
    }

    function getHighscorer(uint256 idx) public view returns(string memory) {
        bytes[][] memory paths = new bytes[][](1);
        paths[0] = new bytes[](2);
        paths[0][0] = abi.encode(DYNAMIC_MASK | bytes32(uint256(4)));
        paths[0][1] = abi.encode(idx);

        getStorageSlots(verifier, address(this), paths, this.getNameCallback.selector, "");
    }

    function getHighscorerCallback(bytes[] memory values, bytes memory) public pure returns(string memory) {
        return string(values[0]);
    }

    function getLatestHighscore() public view returns(uint256) {
        bytes[][] memory paths = new bytes[][](2);
        paths[0] = new bytes[](1);
        paths[0][0] = abi.encode(uint256(1));
        paths[1] = new bytes[](2);
        paths[1][0] = abi.encode(uint256(3));
        paths[1][1] = abi.encode(uint256(MAGIC_SLOT) + 0);

        getStorageSlots(verifier, address(this), paths, this.getLatestHighscoreCallback.selector, "");
    }

    function getLatestHighscoreCallback(bytes[] memory values, bytes memory) public pure returns(uint256) {
        return abi.decode(values[1], (uint256));
    }

    function getLatestHighscorer() public view returns(string memory) {
        bytes[][] memory paths = new bytes[][](2);
        paths[0] = new bytes[](1);
        paths[0][0] = abi.encode(uint256(1));
        paths[1] = new bytes[](2);
        paths[1][0] = abi.encode(DYNAMIC_MASK | bytes32(uint256(4)));
        paths[1][1] = abi.encode(uint256(MAGIC_SLOT) + 0);

        getStorageSlots(verifier, address(this), paths, this.getLatestHighscorerCallback.selector, "");
    }

    function getLatestHighscorerCallback(bytes[] memory values, bytes memory) public pure returns(string memory) {
        return string(values[1]);
    }
}