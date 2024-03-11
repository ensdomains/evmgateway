export default [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_poseidon",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_rollup",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "poseidon",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "rollup",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "batchIndex",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "storageKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "proof",
        "type": "bytes"
      }
    ],
    "name": "verifyStateCommitment",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "storageValue",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "storageKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "proof",
        "type": "bytes"
      }
    ],
    "name": "verifyZkTrieProof",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "stateRoot",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "storageValue",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]