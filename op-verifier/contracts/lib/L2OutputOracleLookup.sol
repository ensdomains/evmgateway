// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IL2OutputOracle, IOptimismPortalOutputRoot, Types} from "./IOptimismPortalOutputRoot.sol";

/**
 * @title L2OutputOracleLookup
 * @dev Library for querying L2 output oracles in the Optimism portal.
 */
library L2OutputOracleLookup {
    /**
     * @dev Emitted when the L2 output is expired.
     * @param l2OutputIndex Index of the L2 output.
     * @param age Current age of the output.
     * @param maxAge Maximum age allowed for the output.
     */
    error OutputExpired(uint256 l2OutputIndex, uint256 age, uint256 maxAge);

    /**
     * @dev Emitted when the L2 output is too early to be challenged.
     * @param l2OutputIndex Index of the L2 output.
     * @param age Current age of the output.
     * @param minAge Minimum age required to challenge the output.
     */
    error OutputTooEarly(uint256 l2OutputIndex, uint256 age, uint256 minAge);

    /**
     * @dev Emitted when no L2 output is found within the specified minimum age.
     * @param minAge Minimum age required.
     */
    error OutputNotFound(uint256 minAge);

    /**
     * @dev Emitted when the L2 output oracle is deprecated.
     */
    error L2OutputOracleDeprecated();

    /**
     * @notice Internal function to get the L2 output oracle from the Optimism portal.
     * @param optimismPortal The Optimism portal output root contract.
     * @return oracle The L2 output oracle.
     */
    function _l2OutputOracle(
        IOptimismPortalOutputRoot optimismPortal
    ) internal view returns (IL2OutputOracle) {
        try optimismPortal.l2Oracle() returns (IL2OutputOracle oracle) {
            if (address(oracle) == address(0)) {
                revert L2OutputOracleDeprecated();
            }

            return oracle;
        } catch {
            revert L2OutputOracleDeprecated();
        }
    }

    /**
     * @notice Retrieves the latest L2 output that meets the specified age criteria.
     * @param optimismPortal The Optimism portal output root contract.
     * @param minAge The minimum age required for the output.
     * @param maxAge The maximum age allowed for the output.
     * @return index The index of the latest L2 output.
     * @return The latest L2 output proposal.
     */
    function getLatestL2Output(
        IOptimismPortalOutputRoot optimismPortal,
        uint256 minAge,
        uint256 maxAge
    ) internal view returns (uint256 index, Types.OutputProposal memory) {
        IL2OutputOracle oracle = _l2OutputOracle(optimismPortal);
        uint256 length = oracle.latestOutputIndex();

        uint256 maxTimestamp = block.timestamp - minAge;

        // Perform a reverse linear search since we only use recent output most of the time.
        for (uint256 i = length; i >= 0 && i <= length; ) {
            Types.OutputProposal memory output = oracle.getL2Output(i);

            if (output.timestamp <= maxTimestamp) {
                if (maxAge == 0 || output.timestamp + maxAge >= block.timestamp) {
                    return (i, output);
                } else {
                    revert OutputExpired(
                        i,
                        block.timestamp - output.timestamp,
                        maxAge
                    );
                }
            }

            unchecked {
                i--;
            }
        }

        revert OutputNotFound(minAge);
    }

    /**
     * @notice Retrieves the L2 output at the specified index that meets the specified age criteria.
     * @param optimismPortal The Optimism portal output root contract.
     * @param index The index of the L2 output.
     * @param minAge The minimum age required for the output.
     * @param maxAge The maximum age allowed for the output.
     * @return The L2 output proposal.
     */
    function getL2Output(
        IOptimismPortalOutputRoot optimismPortal,
        uint256 index,
        uint256 minAge,
        uint256 maxAge
    ) internal view returns (Types.OutputProposal memory) {
        IL2OutputOracle oracle = _l2OutputOracle(optimismPortal);
        Types.OutputProposal memory output = oracle.getL2Output(index);

        // Wait for challenger to challenge the output
        if (block.timestamp - output.timestamp < minAge) {
            revert OutputTooEarly(
                index,
                block.timestamp - output.timestamp,
                minAge
            );
        }

        // Reject output that has been expired
        if (maxAge > 0 && block.timestamp - output.timestamp > maxAge) {
            revert OutputExpired(
                index,
                block.timestamp - output.timestamp,
                maxAge
            );
        }

        return output;
    }
}
