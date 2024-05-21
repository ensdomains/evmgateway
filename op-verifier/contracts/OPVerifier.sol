// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';
import {RLPReader} from '@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol';
import {StateProof, EVMProofHelper} from '@ensdomains/evm-verifier/contracts/EVMProofHelper.sol';
import {Types} from '@eth-optimism/contracts-bedrock/src/libraries/Types.sol';
import {Hashing} from '@eth-optimism/contracts-bedrock/src/libraries/Hashing.sol';
import './interfaces/IDisputeGame.sol';
import './interfaces/IDisputeGameFactory.sol';

enum OPWitnessProofType {
    L2OutputOracle,
    DisputeGame
}

struct OPWitnessData {
    OPWitnessProofType proofType;
    uint256 index;
    Types.OutputRootProof outputRootProof;
}

interface IL2OutputOracle {
    function getL2Output(
        uint256 _l2OutputIndex
    ) external view returns (Types.OutputProposal memory);
}

interface IOptimismPortal {
    function l2Oracle() external view returns (IL2OutputOracle);

    function disputeGameFactory() external view returns (IDisputeGameFactory);

    function respectedGameType() external view returns (GameType);
}

contract OPVerifier is IEVMVerifier {
    error OutputRootMismatch(
        OPWitnessProofType proofType,
        uint256 index,
        bytes32 expected,
        bytes32 actual
    );
    error GameTypeMismatch(
        uint256 disputeGameIndex,
        GameType expected,
        GameType actual
    );
    error GameChallenged(uint256 disputeGameIndex);
    error GameTooEarly(
        uint256 disputeGameIndex,
        uint256 age,
        uint256 minimumAge
    );
    error DeprecatedProof(
        OPWitnessProofType proofType,
        uint256 disputeGameIndex
    );

    IOptimismPortal public immutable optimismPortal;
    uint256 public immutable disputeGameMinAge;

    string[] _gatewayURLs;

    constructor(
        string[] memory urls,
        address optimismPortalAddress,
        uint256 minimumAge
    ) {
        _gatewayURLs = urls;
        optimismPortal = IOptimismPortal(optimismPortalAddress);
        disputeGameMinAge = minimumAge;
    }

    function gatewayURLs() external view returns (string[] memory) {
        return _gatewayURLs;
    }

    function getL2OracleOutput(uint256 index) internal view returns (bytes32) {
        IL2OutputOracle opOracle = optimismPortal.l2Oracle();

        // If opOracle address is zero then revert with deprecated
        if (address(opOracle) == address(0))
            revert DeprecatedProof(OPWitnessProofType.L2OutputOracle, index);

        // Get L2 Output Proposal at index
        Types.OutputProposal memory l2out = opOracle.getL2Output(index);
        return l2out.outputRoot;
    }

    function getDisputeGameOutput(
        uint256 index
    ) internal view returns (bytes32) {
        IDisputeGameFactory disputeGameFactory = optimismPortal
            .disputeGameFactory();

        // If disputeGameFactory address is zero then revert with deprecated
        if (address(disputeGameFactory) == address(0))
            revert DeprecatedProof(OPWitnessProofType.DisputeGame, index);

        // Get gameType used for L2 withdrawal
        GameType respectedGameType = optimismPortal.respectedGameType();

        // Get dispute game at index
        (
            GameType gameType,
            Timestamp gameCreationTimeRaw,
            IDisputeGame gameProxy
        ) = disputeGameFactory.gameAtIndex(index);
        Claim outputRoot = gameProxy.rootClaim();

        // Unwrap gameCreationTime to uint64
        uint64 gameCreationTime;
        assembly {
            gameCreationTime := gameCreationTimeRaw
        }

        // Wait for challenger to challenge the dispute game
        if (block.timestamp - gameCreationTime < disputeGameMinAge) {
            revert GameTooEarly(
                index,
                block.timestamp - gameCreationTime,
                disputeGameMinAge
            );
        }

        // Revert if gameType is not the one used for L2 withdrawal
        if (gameType.raw() != respectedGameType.raw()) {
            revert GameTypeMismatch(index, respectedGameType, gameType);
        }

        // Revert if the game is challenged
        if (gameProxy.status() == GameStatus.CHALLENGER_WINS) {
            revert GameChallenged(index);
        }

        return outputRoot.raw();
    }

    function getStorageValues(
        address target,
        bytes32[] memory commands,
        bytes[] memory constants,
        bytes memory proof
    ) external view returns (bytes[] memory values) {
        (OPWitnessData memory opData, StateProof memory stateProof) = abi
            .decode(proof, (OPWitnessData, StateProof));
        bytes32 expectedRoot = Hashing.hashOutputRootProof(
            opData.outputRootProof
        );

        bytes32 outputRoot;

        if (opData.proofType == OPWitnessProofType.DisputeGame) {
            outputRoot = getDisputeGameOutput(opData.index);
        } else if (opData.proofType == OPWitnessProofType.L2OutputOracle) {
            outputRoot = getL2OracleOutput(opData.index);
        }

        if (outputRoot != expectedRoot) {
            revert OutputRootMismatch(
                opData.proofType,
                opData.index,
                expectedRoot,
                outputRoot
            );
        }
        return
            EVMProofHelper.getStorageValues(
                target,
                commands,
                constants,
                opData.outputRootProof.stateRoot,
                stateProof
            );
    }
}
