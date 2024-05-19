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
    uint256 l2OutputIndex;
    Types.OutputRootProof outputRootProof;
}

interface IL2OutputOracle {
    function getL2Output(uint256 _l2OutputIndex) external view returns (Types.OutputProposal memory);
}

interface IOptimismPortal {
    function l2Oracle() external view returns(IL2OutputOracle);
    function disputeGameFactory() external view returns(IDisputeGameFactory);
    function respectedGameType() external view returns(GameType);
}

contract OPVerifier is IEVMVerifier {
    error OutputRootMismatch(uint256 l2OutputIndex, bytes32 expected, bytes32 actual);
    error GameTypeMismatch(uint256 disputeGameIndex, GameType expected, GameType actual);
    error GameChallenged(uint256 disputeGameIndex);
    error GameTooEarly(uint256 disputeGameIndex, uint256 age, uint256 minimumAge);

    IOptimismPortal public immutable optimismPortal;
    uint256 public immutable disputeGameMinAge;
    
    string[] _gatewayURLs;

    constructor(string[] memory urls, address optimismPortalAddress, uint256 minimumAge) {
        _gatewayURLs = urls;
        optimismPortal = IOptimismPortal(optimismPortalAddress);
        disputeGameMinAge = minimumAge;
    }

    function gatewayURLs() external view returns(string[] memory) {
        return _gatewayURLs;
    }

    function getL2OracleOutput(OPWitnessData memory opData) internal view returns(bytes32) {
        try optimismPortal.l2Oracle() returns (IL2OutputOracle opOracle) {
            Types.OutputProposal memory l2out = opOracle.getL2Output(opData.l2OutputIndex);
            return l2out.outputRoot;
        } catch {
            return bytes32(0);
        }
    }

    function getDisputeGameOutput(OPWitnessData memory opData) internal view returns(bytes32) {
        try optimismPortal.disputeGameFactory() returns (IDisputeGameFactory disputeGameFactory) {
            // Get gameType used for L2 withdrawal
            GameType respectedGameType = optimismPortal.respectedGameType();

            // Get dispute game at index
            (GameType gameType, Timestamp gameCreationTimeRaw, IDisputeGame gameProxy) = disputeGameFactory.gameAtIndex(opData.l2OutputIndex);
            Claim outputRoot = gameProxy.rootClaim();

            // Unwrap gameCreationTime to uint64
            uint64 gameCreationTime;
            assembly {
                gameCreationTime := gameCreationTimeRaw
            }

            // Wait for challenger to challenge the dispute game
            if (block.timestamp - gameCreationTime < disputeGameMinAge) {
                revert GameTooEarly(opData.l2OutputIndex, block.timestamp - gameCreationTime, disputeGameMinAge);
            }

            // Revert if gameType is not the one used for L2 withdrawal
            if (gameType.raw() != respectedGameType.raw()) {
                revert GameTypeMismatch(opData.l2OutputIndex, respectedGameType, gameType);
            }

            // Revert if the game is challenged
            if (gameProxy.status() == GameStatus.CHALLENGER_WINS) {
                revert GameChallenged(opData.l2OutputIndex);
            }

            return outputRoot.raw();
        } catch {
            return bytes32(0);
        }
    }

    function getStorageValues(address target, bytes32[] memory commands, bytes[] memory constants, bytes memory proof) external view returns(bytes[] memory values) {
        (OPWitnessData memory opData, StateProof memory stateProof) = abi.decode(proof, (OPWitnessData, StateProof));
        bytes32 expectedRoot = Hashing.hashOutputRootProof(opData.outputRootProof);
        
        bytes32 outputRoot = getDisputeGameOutput(opData);

        // Fallback to L2OutputOracle in case dispute game is not enabled
        if (outputRoot == bytes32(0)) {
            outputRoot = getL2OracleOutput(opData);
        }
        
        if(outputRoot != expectedRoot) {
            revert OutputRootMismatch(opData.l2OutputIndex, expectedRoot, outputRoot);
        }
        return EVMProofHelper.getStorageValues(target, commands, constants, opData.outputRootProof.stateRoot, stateProof);
    }
}
