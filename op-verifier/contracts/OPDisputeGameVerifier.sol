// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { IEVMVerifier } from "@ensdomains/evm-verifier/contracts/IEVMVerifier.sol";
import { RLPReader } from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol";
import { StateProof, EVMProofHelper } from "@ensdomains/evm-verifier/contracts/EVMProofHelper.sol";
import { Types } from "@eth-optimism/contracts-bedrock/src/libraries/Types.sol";
import { Hashing } from "@eth-optimism/contracts-bedrock/src/libraries/Hashing.sol";
import "./interfaces/IDisputeGame.sol";
import "./interfaces/IDisputeGameFactory.sol";

struct OPWitnessData {
    uint256 disputeGameIndex;
    Types.OutputRootProof outputRootProof;
}

// https://docs.optimism.io/builders/notices/fp-changes#overview-of-changes
contract OPDisputeGameVerifier is IEVMVerifier {
    error OutputRootMismatch(uint256 disputeGameIndex, bytes32 expected, bytes32 actual);
    error GameTypeMismatch(uint256 disputeGameIndex, GameType expected, GameType actual);
    error GameChallenged(uint256 disputeGameIndex);

    IDisputeGameFactory public disputeGameFactory;
    string[] _gatewayURLs;

    // The game type that the OptimismPortal consults for output proposals.
    GameType public respectedGameType;

    constructor(string[] memory urls, address game, GameType gameType) {
        _gatewayURLs = urls;
        disputeGameFactory = IDisputeGameFactory(game);
        respectedGameType = gameType;
    }

    function gatewayURLs() external view returns(string[] memory) {
        return _gatewayURLs;
    }

    function getStorageValues(address target, bytes32[] memory commands, bytes[] memory constants, bytes memory proof) external view returns(bytes[] memory values) {
        (OPWitnessData memory opData, StateProof memory stateProof) = abi.decode(proof, (OPWitnessData, StateProof));
        (GameType gameType,, IDisputeGame gameProxy) = disputeGameFactory.gameAtIndex(opData.disputeGameIndex);
        Claim outputRoot = gameProxy.rootClaim();

        if (gameType.raw() != respectedGameType.raw()) {
            revert GameTypeMismatch(opData.disputeGameIndex, respectedGameType, gameType);
        }

        bytes32 expectedRoot = Hashing.hashOutputRootProof(opData.outputRootProof);
        if(outputRoot.raw() != expectedRoot) {
            revert OutputRootMismatch(opData.disputeGameIndex, expectedRoot, outputRoot.raw());
        }

        if (gameProxy.status() == GameStatus.CHALLENGER_WINS) {
            revert GameChallenged(opData.disputeGameIndex);
        }

        return EVMProofHelper.getStorageValues(target, commands, constants, opData.outputRootProof.stateRoot, stateProof);
    }
}
