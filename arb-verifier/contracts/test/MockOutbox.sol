import {Node, IRollupCore} from '@arbitrum/nitro-contracts/src/rollup/IRollupCore.sol';

contract MockRollup {
    function pushNode(uint idx, bytes calldata encodedNode) external {
        Node memory node = abi.decode(encodedNode, (Node));
        roots[idx] = node;
    }

    function getNode(uint64 idx) external view returns (Node memory) {
        return roots[idx];
    }

    mapping(uint256 => Node) public roots; // maps root hashes => L2 block hash
}
