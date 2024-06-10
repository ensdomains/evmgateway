//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// keep sync with EVMGateway.ts
uint8 constant FLAG_DYNAMIC = 0x01;

// the upper 3 bits are op
uint8 constant OP_FOLLOW_CONST = 0 << 5;
uint8 constant OP_FOLLOW_REF   = 1 << 5;
uint8 constant OP_ADD_CONST    = 2 << 5;
uint8 constant OP_END          = 0xFF;
