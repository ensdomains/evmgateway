//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
import {DelegatableResolver} from "@ensdomains/ens-contracts/contracts/resolvers/DelegatableResolver.sol";

/**
 * A sample delegated resolver registrar that allows anyone to register subname
 */
contract DelegatableResolverRegistrar {
    DelegatableResolver public resolver;

    constructor(DelegatableResolver _resolver) {
        resolver = _resolver;
    }

    /**
     * @dev Approve an operator to be able to updated records on a node.
     * @param name      The encoded subname
     * @param operator  The address to approve
     */

    function register(bytes memory name, address operator) external {
        (bytes32 node, bool authorized) = resolver.getAuthorisedNode(
            name,
            0,
            operator
        );
        if (authorized == false) {
            resolver.approve(name, operator, true);
        }
    }
}