// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract L2Resolver {
    mapping(bytes32 => uint64) public recordVersions; // Slot 0
    mapping(uint64 => mapping(bytes32 => mapping(uint256 => bytes))) versionable_addresses; // Slot 1
    uint256 private constant COIN_TYPE_ETH = 60; // Slot 2

    function addr(
        bytes32 node,
        uint256 coinType
    ) public view returns (bytes memory) {
        return versionable_addresses[recordVersions[node]][node][coinType];
    }

    function setAddr(bytes32 node, address _addr) public {
        setAddr(node, COIN_TYPE_ETH, addressToBytes(_addr));
    }

    function setAddr(bytes32 node, uint256 coinType, bytes memory a) public {
        versionable_addresses[recordVersions[node]][node][coinType] = a;
    }

    function clearRecords(bytes32 node) public {
        recordVersions[node]++;
    }

    function addressToBytes(address a) internal pure returns (bytes memory b) {
        b = new bytes(20);
        assembly {
            mstore(add(b, 32), mul(a, exp(256, 12)))
        }
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
