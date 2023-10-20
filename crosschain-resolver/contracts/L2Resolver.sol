// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract L2Resolver {
    mapping(bytes32 => uint64) public recordVersions; // Slot 0
    mapping(uint64 => mapping(bytes32 => bytes)) versionable_addresses; // Slot 1

    function addr(bytes32 node) public view returns (address) {
        return
            bytesToAddress(versionable_addresses[recordVersions[node]][node]);
    }

    function setAddr(bytes32 node, address _addr) public {
        versionable_addresses[recordVersions[node]][node] = addressToBytes(
            _addr
        );
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
