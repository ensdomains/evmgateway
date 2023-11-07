// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract TestL2 {
    uint256 latest;                         // Slot 0
    string name;                            // Slot 1
    mapping(uint256=>uint256) highscores;   // Slot 2
    mapping(uint256=>string) highscorers;   // Slot 3
    mapping(string=>string) realnames;      // Slot 4
    uint256 zero;                           // Slot 5

    constructor() {
        latest = 42;
        name = "Satoshi";
        highscores[0] = 1;
        highscores[latest] = 12345;
        highscorers[latest] = "Hal Finney";
        highscorers[1] = "Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.";
        realnames["Money Skeleton"] = "Vitalik Buterin";
        realnames["Satoshi"] = "Hal Finney";
    }
}