// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title LibGameType
/// @notice This library contains helper functions for working with the `GameType` type.
library LibGameType {
    /// @notice Get the value of a `GameType` type in the form of the underlying uint8.
    /// @param _gametype The `GameType` type to get the value of.
    /// @return gametype_ The value of the `GameType` type as a uint8 type.
    function raw(GameType _gametype) internal pure returns (uint8 gametype_) {
        assembly {
            gametype_ := _gametype
        }
    }
}

/// @title LibClaim
/// @notice This library contains helper functions for working with the `Claim` type.
library LibClaim {
    /// @notice Get the value of a `Claim` type in the form of the underlying bytes32.
    /// @param _claim The `Claim` type to get the value of.
    /// @return claim_ The value of the `Claim` type as a bytes32 type.
    function raw(Claim _claim) internal pure returns (bytes32 claim_) {
        assembly {
            claim_ := _claim
        }
    }
}

/// @notice A custom type for a generic hash.
type Hash is bytes32;

/// @notice A claim represents an MPT root representing the state of the fault proof program.
type Claim is bytes32;

/// @notice A claim hash represents a hash of a claim and a position within the game tree.
/// @dev Keccak hash of abi.encodePacked(Claim, Position);
type ClaimHash is bytes32;

/// @notice A bondamount represents the amount of collateral that a user has locked up in a claim.
type BondAmount is uint256;

/// @notice A dedicated timestamp type.
type Timestamp is uint64;

/// @notice A dedicated duration type.
/// @dev Unit: seconds
type Duration is uint64;

/// @notice A `GameId` represents a packed 1 byte game ID, an 11 byte timestamp, and a 20 byte address.
/// @dev The packed layout of this type is as follows:
/// ┌───────────┬───────────┐
/// │   Bits    │   Value   │
/// ├───────────┼───────────┤
/// │ [0, 8)    │ Game Type │
/// │ [8, 96)   │ Timestamp │
/// │ [96, 256) │ Address   │
/// └───────────┴───────────┘
type GameId is bytes32;

/// @notice A `Clock` represents a packed `Duration` and `Timestamp`
/// @dev The packed layout of this type is as follows:
/// ┌────────────┬────────────────┐
/// │    Bits    │     Value      │
/// ├────────────┼────────────────┤
/// │ [0, 64)    │ Duration       │
/// │ [64, 128)  │ Timestamp      │
/// └────────────┴────────────────┘
type Clock is uint128;

/// @notice A `Position` represents a position of a claim within the game tree.
/// @dev This is represented as a "generalized index" where the high-order bit
/// is the level in the tree and the remaining bits is a unique bit pattern, allowing
/// a unique identifier for each node in the tree. Mathematically, it is calculated
/// as 2^{depth} + indexAtDepth.
type Position is uint128;

/// @notice A `GameType` represents the type of game being played.
type GameType is uint32;

/// @notice A `VMStatus` represents the status of a VM execution.
type VMStatus is uint8;

using LibClaim for Claim global;
using LibGameType for GameType global;

/// @notice The current status of the dispute game.
enum GameStatus {
    // The game is currently in progress, and has not been resolved.
    IN_PROGRESS,
    // The game has concluded, and the `rootClaim` was challenged successfully.
    CHALLENGER_WINS,
    // The game has concluded, and the `rootClaim` could not be contested.
    DEFENDER_WINS
}

/// @notice Represents an L2 output root and the L2 block number at which it was generated.
/// @custom:field root The output root.
/// @custom:field l2BlockNumber The L2 block number at which the output root was generated.
struct OutputRoot {
    Hash root;
    uint256 l2BlockNumber;
}

/// @title IDisputeGame
/// @notice The generic interface for a DisputeGame contract.
interface IDisputeGame {
    /// @notice Emitted when the game is resolved.
    /// @param status The status of the game after resolution.
    event Resolved(GameStatus indexed status);

    /// @notice Returns the timestamp that the DisputeGame contract was created at.
    /// @return createdAt_ The timestamp that the DisputeGame contract was created at.
    function createdAt() external view returns (Timestamp createdAt_);

    /// @notice Returns the timestamp that the DisputeGame contract was resolved at.
    /// @return resolvedAt_ The timestamp that the DisputeGame contract was resolved at.
    function resolvedAt() external view returns (Timestamp resolvedAt_);

    /// @notice Returns the current status of the game.
    /// @return status_ The current status of the game.
    function status() external view returns (GameStatus status_);

    /// @notice Getter for the game type.
    /// @dev The reference impl should be entirely different depending on the type (fault, validity)
    ///      i.e. The game type should indicate the security model.
    /// @return gameType_ The type of proof system being used.
    function gameType() external view returns (GameType gameType_);

    /// @notice Getter for the root claim.
    /// @dev `clones-with-immutable-args` argument #1
    /// @return rootClaim_ The root claim of the DisputeGame.
    function rootClaim() external pure returns (Claim rootClaim_);

    /// @notice Getter for the extra data.
    /// @dev `clones-with-immutable-args` argument #2
    /// @return extraData_ Any extra data supplied to the dispute game contract by the creator.
    function extraData() external pure returns (bytes memory extraData_);

    /// @notice If all necessary information has been gathered, this function should mark the game
    ///         status as either `CHALLENGER_WINS` or `DEFENDER_WINS` and return the status of
    ///         the resolved game. It is at this stage that the bonds should be awarded to the
    ///         necessary parties.
    /// @dev May only be called if the `status` is `IN_PROGRESS`.
    /// @return status_ The status of the game after resolution.
    function resolve() external returns (GameStatus status_);

    /// @notice A compliant implementation of this interface should return the components of the
    ///         game UUID's preimage provided in the cwia payload. The preimage of the UUID is
    ///         constructed as `keccak256(gameType . rootClaim . extraData)` where `.` denotes
    ///         concatenation.
    /// @return gameType_ The type of proof system being used.
    /// @return rootClaim_ The root claim of the DisputeGame.
    /// @return extraData_ Any extra data supplied to the dispute game contract by the creator.
    function gameData() external view returns (GameType gameType_, Claim rootClaim_, bytes memory extraData_);
}