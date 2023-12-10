export default [
    {
        "inputs": [
            {
                "components": [
                    {
                        "components": [
                            {
                                "components": [
                                    {
                                        "internalType": "bytes32[2]",
                                        "name": "bytes32Vals",
                                        "type": "bytes32[2]"
                                    },
                                    {
                                        "internalType": "uint64[2]",
                                        "name": "u64Vals",
                                        "type": "uint64[2]"
                                    }
                                ],
                                "internalType": "struct GlobalState",
                                "name": "globalState",
                                "type": "tuple"
                            },
                            {
                                "internalType": "enum MachineStatus",
                                "name": "machineStatus",
                                "type": "uint8"
                            }
                        ],
                        "internalType": "struct ExecutionState",
                        "name": "beforeState",
                        "type": "tuple"
                    },
                    {
                        "components": [
                            {
                                "components": [
                                    {
                                        "internalType": "bytes32[2]",
                                        "name": "bytes32Vals",
                                        "type": "bytes32[2]"
                                    },
                                    {
                                        "internalType": "uint64[2]",
                                        "name": "u64Vals",
                                        "type": "uint64[2]"
                                    }
                                ],
                                "internalType": "struct GlobalState",
                                "name": "globalState",
                                "type": "tuple"
                            },
                            {
                                "internalType": "enum MachineStatus",
                                "name": "machineStatus",
                                "type": "uint8"
                            }
                        ],
                        "internalType": "struct ExecutionState",
                        "name": "afterState",
                        "type": "tuple"
                    },
                    {
                        "internalType": "uint64",
                        "name": "numBlocks",
                        "type": "uint64"
                    }
                ],
                "internalType": "struct Assertion",
                "name": "assertion",
                "type": "tuple"
            }
        ],
        "name": "getBlockHash",
        "outputs": [
            {
                "internalType": "bytes32",
                "name": "hash",
                "type": "bytes32"
            }
        ],
        "stateMutability": "pure",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "components": [
                            {
                                "components": [
                                    {
                                        "internalType": "bytes32[2]",
                                        "name": "bytes32Vals",
                                        "type": "bytes32[2]"
                                    },
                                    {
                                        "internalType": "uint64[2]",
                                        "name": "u64Vals",
                                        "type": "uint64[2]"
                                    }
                                ],
                                "internalType": "struct GlobalState",
                                "name": "globalState",
                                "type": "tuple"
                            },
                            {
                                "internalType": "enum MachineStatus",
                                "name": "machineStatus",
                                "type": "uint8"
                            }
                        ],
                        "internalType": "struct ExecutionState",
                        "name": "beforeState",
                        "type": "tuple"
                    },
                    {
                        "components": [
                            {
                                "components": [
                                    {
                                        "internalType": "bytes32[2]",
                                        "name": "bytes32Vals",
                                        "type": "bytes32[2]"
                                    },
                                    {
                                        "internalType": "uint64[2]",
                                        "name": "u64Vals",
                                        "type": "uint64[2]"
                                    }
                                ],
                                "internalType": "struct GlobalState",
                                "name": "globalState",
                                "type": "tuple"
                            },
                            {
                                "internalType": "enum MachineStatus",
                                "name": "machineStatus",
                                "type": "uint8"
                            }
                        ],
                        "internalType": "struct ExecutionState",
                        "name": "afterState",
                        "type": "tuple"
                    },
                    {
                        "internalType": "uint64",
                        "name": "numBlocks",
                        "type": "uint64"
                    }
                ],
                "internalType": "struct Assertion",
                "name": "assertion",
                "type": "tuple"
            }
        ],
        "name": "getSendRoot",
        "outputs": [
            {
                "internalType": "bytes32",
                "name": "root",
                "type": "bytes32"
            }
        ],
        "stateMutability": "pure",
        "type": "function"
    }
]