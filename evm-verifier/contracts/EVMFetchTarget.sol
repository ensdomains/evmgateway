//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { IEVMVerifier } from './IEVMVerifier.sol';
import { IEVMGateway } from './IEVMGateway.sol';
import { Address } from '@openzeppelin/contracts/utils/Address.sol';

/**
 * @dev Callback implementation for users of `EVMFetcher`. If you use `EVMFetcher`, your contract must
 *      inherit from this contract in order to handle callbacks correctly.
 */
abstract contract EVMFetchTarget {
    using Address for address;

    error TargetProofMismatch(uint256 actual, uint256 expected);
    error ResponseLengthMismatch(uint256 actual, uint256 expected);
    error TooManyReturnValues(uint256 max);

    uint256 constant MAX_RETURN_VALUES = 32;

    /**
     * @dev Internal callback function invoked by CCIP-Read in response to a `getStorageSlots` request.
     */
    function getStorageSlotsCallback(bytes calldata response, bytes calldata extradata) external {

        //Decode proofs from the response
        (bytes[] memory proofs) = abi.decode(response, (bytes[]));

        //Decode the extradata
        (IEVMVerifier verifier, IEVMGateway.EVMTargetRequest[] memory tRequests, bytes4 callback, bytes memory callbackData) =
            abi.decode(extradata, (IEVMVerifier, IEVMGateway.EVMTargetRequest[], bytes4, bytes));

        //We proove all returned data on a per target basis
        if(tRequests.length != proofs.length) {
            revert TargetProofMismatch(tRequests.length, proofs.length);
        }

        bytes[] memory returnValues = new bytes[](MAX_RETURN_VALUES);
    
        uint k = 0;

        for (uint i = 0; i < tRequests.length; i++) {
            
            IEVMGateway.EVMTargetRequest memory tRequest = tRequests[i];

            address targetToUse = tRequest.target;

            {
                uint160 targetAsInt = uint160(bytes20(tRequest.target));

                if (targetAsInt <= 256) {

                    targetToUse = abi.decode(returnValues[0], (address));
                }
            }

            bytes[] memory values = verifier.getStorageValues(targetToUse, tRequest.commands, tRequest.constants, proofs[i]);
            
            if(values.length != tRequest.commands.length) {
                revert ResponseLengthMismatch(values.length, tRequest.commands.length);
            }

            for (uint j = 0; j < values.length; j++) {
                returnValues[k] = values[j];
                k++;
            }
        }

        assembly {
            mstore(returnValues, k) // Increment returnValues array length
        }
        if(k > MAX_RETURN_VALUES) {
            revert TooManyReturnValues(MAX_RETURN_VALUES);
        }

        bytes memory ret = address(this).functionCall(abi.encodeWithSelector(callback, returnValues, callbackData));

        assembly {
            return(add(ret, 32), mload(ret))
        }
    }
}
