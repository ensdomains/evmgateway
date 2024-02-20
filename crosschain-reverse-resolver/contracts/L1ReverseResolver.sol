// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {EVMFetcher} from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import {EVMFetchTarget} from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/INameResolver.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/ITextResolver.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
// import "@ensdomains/ens-contracts/contracts/reverseRegistrar/IDefaultReverseResolver.sol";
import "@ensdomains/ens-contracts/contracts/utils/HexUtils.sol";
import "hardhat/console.sol";

interface IDefaultReverseResolver {
    event NameChanged(bytes32 indexed node, string name);
    event TextChanged(
        bytes32 indexed node,
        string indexed indexedKey,
        string key,
        string value
    );

    function name(address addr) external view returns (string memory);

    function text(
        address addr,
        string memory key
    ) external view returns (string memory);
}

contract L1ReverseResolver is EVMFetchTarget, INameResolver, ITextResolver, ERC165 {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;
    IEVMVerifier immutable verifier;
    address immutable target;
    IDefaultReverseResolver immutable defaultReverseResolver;
    uint256 constant VERSIONABLE_TEXTS_SLOT = 2;
    uint256 constant VERSIONABLE_NAME_SLOT = 3;
    uint256 constant RECORD_VERSIONS_SLOT = 4;
    using HexUtils for bytes;

    constructor(IEVMVerifier _verifier, address _target, IDefaultReverseResolver _defaultReverseResolver ) {
        verifier = _verifier;
        target = _target;
        defaultReverseResolver = _defaultReverseResolver;
    }

    /**
     * Returns the address associated with an ENS node.
     * @param node The ENS node to query.
     * @return The associated name.
     */
            //  return versionable_names[recordVersions[node]][node];
    function name(bytes32 node) public view returns (string memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(RECORD_VERSIONS_SLOT)
              .element(node)
            .getDynamic(VERSIONABLE_NAME_SLOT)
              .ref(0)
              .element(node)
            .fetch(this.nameCallback.selector, msg.data); // recordVersions
    }

    function nameCallback(
        bytes[] memory values,
        bytes memory callbackdata
    ) public view returns (bytes memory) {
    // ) public view returns (string memory) {
        return callbackdata;
        
        if(values[1].length == 0 ){
            (address addr, ) = callbackdata.hexToAddress(0, callbackdata.length);
            // return addr;
        //     // return defaultReverseResolver.name(addr);
        }else{
            // return "foo2";
        //     return string(values[1]);
        }
    }

    /**
     * Returns the text data associated with an ENS node and key.
     * @param node The ENS node to query.
     * @param key The text data key to query.
     * @return The associated text data.
     */
    function text(
        bytes32 node,
        string calldata key
    ) public view returns (string memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(RECORD_VERSIONS_SLOT)
              .element(node)
            .getDynamic(VERSIONABLE_TEXTS_SLOT)
              .ref(0)
              .element(node)
              .element(key)
            .fetch(this.textCallback.selector, '');
    }

    function textCallback(
        bytes[] memory values,
        bytes memory
    ) public pure returns (string memory) {
        return string(values[1]);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public override view returns (bool) {
        return
            interfaceId == type(ITextResolver).interfaceId ||
            interfaceId == type(INameResolver).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
