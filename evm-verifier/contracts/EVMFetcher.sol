//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { IEVMVerifier } from './IEVMVerifier.sol';
import { Address } from '@openzeppelin/contracts/utils/Address.sol';

interface IEVMGateway {
    function getStorageSlots(address addr, bytes[][] memory paths) external view returns(bytes memory witness);
}

bytes32 constant DYNAMIC_MASK = 0x8000000000000000000000000000000000000000000000000000000000000000;
bytes32 constant MAGIC_SLOT = 0xd3b7df68fbfff5d2ac8f3603e97698b8e10d49e5cc92d1c72514f593c17b2229;

abstract contract EVMFetcher {
    using Address for address;

    error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);

    /**
     * @dev Fetches the value of multiple storage slots from a contract via CCIP-Read, possibly from another chain.
     *      Supports dynamic length values and slot numbers derived from other retrieved values.
     *      Calling this function terminates execution; clients that implement CCIP-Read will make a callback to
     *      `callback` with the results of the operation.
     * @param verifier An instance of a verifier contract that can provide and verify the storage slot information.
     * @param addr The address of the contract to fetch storage proofs for.
     * @param paths An array of paths for storage slots to retrieve.
     *        Each element in `paths` specifies a series of hashing operations to derive the final slot ID.
     *        See https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html for details on how Solidity lays out storage variables.
     *        In order to support additional functionality, special values are permitted for each element of a path.
     *        The MSB of the first element of a path is reserved to indicate if the value to be retrieved is fixed or dynamic length. If the MSB is 1,
     *        the value is treated as a dynamic length Solidity type and retrieved as such.
     *        Each subsequent element of the path has an arbitrary value, MAGIC_SLOT subtracted from it; if the result is less than the number of previous
     *        entries, the value of the previous entry is substituted.
     * @param callback A callback function selector on this contract that will be invoked via CCIP-Read with the result of the lookup.
     *        The function must have a signature matching `(bytes[] memory values, bytes callbackData)` with a return type matching the call in which
     *        this function was invoked. Its return data will be returned as the return value of the entire CCIP-read operation.
     * @param callbackData Extra data to supply to the callback.
     *
     *        The following examples assume a Solidity contract with the following storage mapping:
     *        ```
     *        contract Test {
                uint256 latest;
                string name;
                mapping(uint256=>uint256) highscores;
                mapping(uint256=>string) highscorers;
     *        }
     *        ```
     *        Examples:
     *          `[[0x0]]` - Fetches a fixed-length storage proof for `latest`.
     *          `[[0x8...1]]` - Fetches a dynamic-length storage proof for `name`.
     *          `[[0x2, 0x0]]` - Fetches a fixed-length storage proof for `highscores[0]`.
     *          `[[0x8...3, 0x0]]` - Fetches a dynamic-length storage proof for `highscorers[0]`.
     *          `[[0x0], [0x2, MAGIC_SLOT], [0x8...3, MAGIC_SLOT]]` - Fetches fixed length storage proofs for `latest` and `highscores[latest]` and a
     *            dynamic-length storage proof for `highscorers[latest]`.
     */
    function getStorageSlots(
        IEVMVerifier verifier,
        address addr,
        bytes[][] memory paths,
        bytes4 callback,
        bytes memory callbackData) internal view
    {
        revert OffchainLookup(
            address(this),
            verifier.gatewayURLs(),
            abi.encodeCall(IEVMGateway.getStorageSlots, (addr, paths)),
            this.getStorageSlotsCallback.selector,
            abi.encode(verifier, addr, paths, callback, callbackData)
        );
    }

    /**
     * @dev Internal callback function invoked by CCIP-Read in response to a `getStorageSlots` request.
     */
    function getStorageSlotsCallback(bytes calldata response, bytes calldata extradata) external {
        bytes memory proof = abi.decode(response, (bytes));
        (IEVMVerifier verifier, address addr, bytes[][] memory paths, bytes4 callback, bytes memory callbackData) =
            abi.decode(extradata, (IEVMVerifier, address, bytes[][], bytes4, bytes));
        bytes[] memory values = verifier.getStorageValues(addr, paths, proof);
        require(values.length == paths.length, "Invalid number of values");
        bytes memory ret = address(this).functionCall(abi.encodeWithSelector(callback, values, callbackData));
        assembly {
            return(add(ret, 32), mload(ret))
        }
    }
}
