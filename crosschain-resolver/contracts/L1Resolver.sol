// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {EVMFetcher} from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import {EVMFetchTarget} from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';
import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {INameWrapper} from "@ensdomains/ens-contracts/contracts/wrapper/INameWrapper.sol";
import {BytesUtils} from "@ensdomains/ens-contracts/contracts/dnssec-oracle/BytesUtils.sol";
import {IAddrResolver} from "@ensdomains/ens-contracts/contracts/resolvers/profiles/IAddrResolver.sol";
import {IAddressResolver} from "@ensdomains/ens-contracts/contracts/resolvers/profiles/IAddressResolver.sol";
import {ITextResolver} from "@ensdomains/ens-contracts/contracts/resolvers/profiles/ITextResolver.sol";
import {IContentHashResolver} from "@ensdomains/ens-contracts/contracts/resolvers/profiles/IContentHashResolver.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/IExtendedResolver.sol";
import {ITargetResolver} from './ITargetResolver.sol';
import {IMetadataResolver} from './IMetadataResolver.sol';
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract L1Resolver is EVMFetchTarget, ITargetResolver, IMetadataResolver, IExtendedResolver, ERC165 {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;
    using BytesUtils for bytes;
    IEVMVerifier public immutable verifier;
    ENS public immutable ens;
    INameWrapper public immutable nameWrapper;
    mapping(bytes32 => address) targets;
    uint256 constant COIN_TYPE_ETH = 60;
    uint256 constant RECORD_VERSIONS_SLOT = 0;
    uint256 constant VERSIONABLE_ADDRESSES_SLOT = 2;
    uint256 constant VERSIONABLE_HASHES_SLOT = 3;
    uint256 constant VERSIONABLE_TEXTS_SLOT = 10;
    string  public   graphqlUrl;
    uint256 public   l2ResolverCoinType;

    event TargetSet(bytes name, address target);
    function isAuthorised(bytes32 node) internal view returns (bool) {
        // TODO: Add support for
        // trustedETHController
        // trustedReverseRegistrar
        // isApprovedForAll
        // isApprovedFor
        address owner = ens.owner(node);
        if (owner == address(nameWrapper)) {
          owner = nameWrapper.ownerOf(uint256(node));
        }
        return owner == msg.sender;
    }

    /**
     * @param _verifier     The chain verifier address
     * @param _ens          The ENS registry address
     * @param _nameWrapper  The ENS name wrapper address
     * @param _graphqlUrl   The offchain/l2 graphql endpoint url
     * @param _l2ResolverCoinType The chainId at which the resolver resolves data from. 0 if storageLocation is offChain
     */
    constructor(
      IEVMVerifier _verifier,
      ENS _ens,
      INameWrapper _nameWrapper,
      string memory _graphqlUrl,
      uint256 _l2ResolverCoinType
    ){
      require(address(_nameWrapper) != address(0), "Name Wrapper address must be set");
      require(address(_verifier) != address(0), "Verifier address must be set");
      require(address(_ens)  != address(0), "Registry address must be set");
      verifier = _verifier;
      ens = _ens;
      nameWrapper = _nameWrapper;
      graphqlUrl = _graphqlUrl;
      l2ResolverCoinType = _l2ResolverCoinType;
    }

    /**
     * Set target address to verify aagainst
     * @param name The encoded name to query.
     * @param target The L2 resolver address to verify against.
     */
    function setTarget(bytes calldata name, address target) public {
      (bytes32 node,) = getTarget(name);
      require(isAuthorised(node));
      targets[node] = target;
      emit TargetSet(name, target);
      (
        ,,
        uint8 storageType,
        bytes memory storageLocation,
        bytes memory context
      ) = metadata(name);
      emit MetadataChanged(
        name,
        l2ResolverCoinType,
        graphqlUrl,
        storageType,
        storageLocation,
        context
      );
    }

    /**
     * @dev Returns the L2 target address that can answer queries for `name`.
     * @param name DNS encoded ENS name to query
     * @return node The node of the name
     * @return target The L2 resolver address to verify against.
     */
    function getTarget(
        bytes memory name
    ) public view returns (bytes32 node, address target) {
        return _getTarget(name, 0);
    }

    function _getTarget(
        bytes memory name,
        uint256 offset
    ) private view returns (bytes32 node, address target) {
        uint256 len = name.readUint8(offset);
        node = bytes32(0);
        if (len > 0) {
            bytes32 label = name.keccak(offset + 1, len);
            (node, target) = _getTarget(
                name,
                offset + len + 1
            );
            node = keccak256(abi.encodePacked(node, label));
            if(targets[node] != address(0)){
                return (
                    node,
                    targets[node]
                );
            }
        } else {
            return (
                bytes32(0),
                address(0)
            );
        }
        return (node, target);
    }

    /** 
     * @dev Resolve and verify a record stored in l2 target address. It supports subname by fetching target recursively to the nearlest parent.
     * @param name DNS encoded ENS name to query
     * @param data The actual calldata
     * @return result result of the call
     */
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory result) {
        (, address target) = _getTarget(name, 0);
        bytes4 selector = bytes4(data);

        if (selector == IAddrResolver.addr.selector) {
            (bytes32 node) = abi.decode(data[4:], (bytes32));
            return _addr(node, target);
        }
        if (selector == IAddressResolver.addr.selector) {
            (bytes32 node, uint256 cointype) = abi.decode(data[4:], (bytes32, uint256));
            return _addr(node, cointype, target);
        }
        if (selector == ITextResolver.text.selector) {
            (bytes32 node, string memory key) = abi.decode(data[4:], (bytes32, string));
            return bytes(_text(node, key, target));
        }
        if (selector == IContentHashResolver.contenthash.selector) {
            (bytes32 node) = abi.decode(data[4:], (bytes32));
            return _contenthash(node, target);
        }
    }

    function _addr(bytes32 node, address target) private view returns (bytes memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(RECORD_VERSIONS_SLOT)
              .element(node)
            .getDynamic(VERSIONABLE_ADDRESSES_SLOT)
              .ref(0)
              .element(node)
              .element(COIN_TYPE_ETH)
            .fetch(this.addrCallback.selector, ''); // recordVersions
    }

    function addrCallback(
        bytes[] memory values,
        bytes memory
    ) public pure returns (bytes memory) {
        return abi.encode(address(bytes20(values[1])));
    }

    function _addr(
        bytes32 node,
        uint256 coinType,
        address target
    ) private view returns (bytes memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(RECORD_VERSIONS_SLOT)
              .element(node)
            .getDynamic(VERSIONABLE_ADDRESSES_SLOT)
              .ref(0)
              .element(node)
              .element(coinType)
            .fetch(this.addrCoinTypeCallback.selector, '');
    }

    function addrCoinTypeCallback(
        bytes[] memory values,
        bytes memory
    ) public pure returns (bytes memory) {
        return abi.encode(values[1]);
    }

    function _text(
        bytes32 node,
        string memory key,
        address target
    ) private view returns (bytes memory) {
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
    ) public pure returns (bytes memory) {
        return abi.encode(string(values[1]));
    }

    function _contenthash(bytes32 node, address target) private view returns (bytes memory) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(RECORD_VERSIONS_SLOT)
              .element(node)
            .getDynamic(VERSIONABLE_HASHES_SLOT)
              .ref(0)
              .element(node)
            .fetch(this.contenthashCallback.selector, '');
    }

    function contenthashCallback(
        bytes[] memory values,
        bytes memory
    ) public pure returns (bytes memory) {
        return abi.encode(values[1]);
    }

    /**
     * @notice Get metadata about the L1 Resolver
     * @dev This function provides metadata about the L1 Resolver, including its name, coin type, GraphQL URL, storage type, and encoded information.
     * @param name The domain name in format (dnsEncoded)
     * @return coinType The cointype of the chain the target contract locates such as Optimism, Base, Arb, etc
     * @return graphqlUrl The GraphQL URL used by the resolver
     * @return storageType Storage Type (0 for EVM)
     * @return storageLocation The storage identifier. For EVM chains, this is the address of the resolver contract.
     * @return context. An identifier used by l2 graph indexer for Domain schema id (`context-namehash`) allowing multiple resolver contracts to have own namespace.
     */
    function metadata(
        bytes calldata name
    ) public view returns (uint256, string memory, uint8, bytes memory, bytes memory) {
        (, address target) = getTarget(name);

        return (
            l2ResolverCoinType,
            graphqlUrl,
            uint8(0), // storage Type 0 => EVM
            abi.encodePacked(address(target)), // storage location => l2 resolver address
            abi.encodePacked(address(target))  // context => l2 resolver address
        );
    }

    function id() public pure returns (bytes4) {
        return type(IMetadataResolver).interfaceId;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public override view returns (bool) {
        return
            interfaceId == type(IExtendedResolver).interfaceId ||
            interfaceId == type(ITargetResolver).interfaceId ||
            interfaceId == type(IMetadataResolver).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
