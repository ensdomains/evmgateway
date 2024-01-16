// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract TestL2 {
    uint256 latest;                         // Slot 0
    address secondAddress;                  // Slot 1
    string name;                            // Slot 2
    mapping(uint256=>uint256) highscores;   // Slot 3
    mapping(uint256=>string) highscorers;   // Slot 4
    mapping(string=>string) realnames;      // Slot 5
    uint256 zero;                           // Slot 6

    constructor(uint256 _latestNumber, address _secondAddress) {
        latest = _latestNumber;
        secondAddress = _secondAddress;
        name = "Satoshi";
        highscores[0] = 1;
        highscores[latest] = 12345;
        highscorers[latest] = "Hal Finney";
        highscorers[1] = "Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.";
        realnames["Money Skeleton"] = "Vitalik Buterin";
        realnames["Satoshi"] = "Hal Finney";
    }
}