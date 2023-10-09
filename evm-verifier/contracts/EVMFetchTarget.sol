//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { IEVMVerifier } from './IEVMVerifier.sol';
import { Address } from '@openzeppelin/contracts/utils/Address.sol';

/**
 * @dev Callback implementation for users of `EVMFetcher`. If you use `EVMFetcher`, your contract must
 *      inherit from this contract in order to handle callbacks correctly.
 */
abstract contract EVMFetchTarget {
    using Address for address;

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
