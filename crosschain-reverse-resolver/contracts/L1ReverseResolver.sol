// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {EVMFetcher} from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import {EVMFetchTarget} from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/INameResolver.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/ITextResolver.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@ensdomains/ens-contracts/contracts/utils/HexUtils.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/IExtendedResolver.sol";

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

contract L1ReverseResolver is EVMFetchTarget, IExtendedResolver, ERC165 {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;
    IEVMVerifier immutable verifier;
    address immutable target;
    IDefaultReverseResolver immutable defaultReverseResolver;
    uint256 constant VERSIONABLE_TEXTS_SLOT = 2;
    uint256 constant VERSIONABLE_NAME_SLOT = 3;
    uint256 constant RECORD_VERSIONS_SLOT = 4;
    uint256 constant ADDRESS_LENGTH = 40;
    using HexUtils for bytes;

    constructor(IEVMVerifier _verifier, address _target, IDefaultReverseResolver _defaultReverseResolver ) {
        verifier = _verifier;
        target = _target;
        defaultReverseResolver = _defaultReverseResolver;
    }

    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory result) {
        bytes4 selector = bytes4(data);
        if (selector == INameResolver.name.selector) {
            (bytes32 node) = abi.decode(data[4:], (bytes32));
            (address addr,) = HexUtils.hexToAddress(name, 1, ADDRESS_LENGTH + 1);
            return bytes(_name(node, addr));
        }
        if (selector == ITextResolver.text.selector) {
            (bytes32 node, string memory key) = abi.decode(data[4:], (bytes32, string));
            return bytes(text(node, key));
        }
    }

    /**
     * Returns the address associated with an ENS node.
     * @param node The ENS node to query.
     * @return The associated name.
     */
            //  return versionable_names[recordVersions[node]][node];
    // function name(bytes32 node) public view returns (string memory) {
    function _name(bytes32 node, address addr) private view returns (string memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(RECORD_VERSIONS_SLOT)
              .element(node)
            .getDynamic(VERSIONABLE_NAME_SLOT)
              .ref(0)
              .element(node)
                .fetch(this.nameCallback.selector, abi.encode(addr)); // recordVersions
    }

    function nameCallback(
        bytes[] memory values,
        bytes memory callbackdata
    ) public view returns (string memory) {        
        if(values[1].length == 0 ){
            (address addr) = abi.decode(callbackdata, (address));
            return defaultReverseResolver.name(addr);
        }else{
            return string(values[1]);
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
        string memory key
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
            interfaceId == type(IExtendedResolver).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
