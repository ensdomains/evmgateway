contract MockOutbox {
    function pushRoot(bytes32 blockHash, bytes32 root) external {
        roots[root] = blockHash;
    }

    mapping(bytes32 => bytes32) public roots; // maps root hashes => L2 block hash
}
