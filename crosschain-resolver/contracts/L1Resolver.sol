// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {EVMFetcher} from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import {EVMFetchTarget} from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import {IEVMVerifier} from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';
import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {INameWrapper} from "@ensdomains/ens-contracts/contracts/wrapper/INameWrapper.sol";
import {BytesUtils} from "@ensdomains/ens-contracts/contracts/dnssec-oracle/BytesUtils.sol";


contract L1Resolver is EVMFetchTarget {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;
    using BytesUtils for bytes;
    IEVMVerifier immutable verifier;
    ENS immutable ens;
    INameWrapper immutable nameWrapper;
    mapping(bytes32 => address) public targets;
    uint256 constant COIN_TYPE_ETH = 60;
    uint256 constant RECORD_VERSIONS_SLOT = 0;
    uint256 constant VERSIONABLE_ADDRESSES_SLOT = 2;
    uint256 constant VERSIONABLE_HASHES_SLOT = 3;
    uint256 constant VERSIONABLE_TEXTS_SLOT = 10;

    event TargetSet(bytes32 indexed node, address target);

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

    modifier authorised(bytes32 node) {
        require(isAuthorised(node));
        _;
    }

    constructor(
      IEVMVerifier _verifier,
      ENS _ens,
      INameWrapper _nameWrapper
    ){
      require(address(_nameWrapper) != address(0), "Name Wrapper address must be set");
      require(address(_verifier) != address(0), "Verifier address must be set");
      require(address(_ens)  != address(0), "Registry address must be set");
      verifier = _verifier;
      ens = _ens;
      nameWrapper = _nameWrapper;
    }

    /**
     * Set target address to verify aagainst
     * @param node The ENS node to query.
     * @param target The L2 resolver address to verify against.
     */
    function setTarget(bytes32 node, address target) public authorised(node){
      targets[node] = target;
      emit TargetSet(node, target);
    }

    /**
     * Query the target address that is verifiable against the name
     * @param name DNS encoded ENS name to query
     * @param offset The offset of the label to query recursively. Start from the 0 position and kepp adding the length of each label as it traverse. The function exits when len is 0.
     * @return node The node of the name
     * @return target The L2 resolver address to verify against.
     */
    function getTarget(
        bytes memory name,
        uint256 offset
    ) public view returns (bytes32 node, address target) {
        uint256 len = name.readUint8(offset);
        node = bytes32(0);
        if (len > 0) {
            bytes32 label = name.keccak(offset + 1, len);
            (node, target) = getTarget(
                name,
                offset + len + 1
            );
            node = keccak256(abi.encodePacked(node, label));
            if(targets[node] != address(0)){
              target = targets[node];
            }
        } else {
            return (
                node,
                target
            );
        }
        return (node, target);
    }

    /** 
     * @dev Resolve and verify a record stored in l2 target address. It supports subname by fetching target recursively to the nearlest parent.
     * @param name DNS encoded ENS name to query
     * @param data The actual calldata
     * @return the result of the call
     */
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory) {
        (bytes32 _node, address target) = getTarget(name, 0);
        bytes4 seletor = bytes4(data);
        if (seletor == 0x3b3b57de) {
            (bytes32 node) = abi.decode(data[4:], (bytes32));
            return addr(node, target);
        }
        if (bytes4(data) == 0xf1cb7e06) {
            (bytes32 node, uint256 cointype) = abi.decode(data[4:], (bytes32, uint256));
            return addr(node, cointype, target);
        }

        if (bytes4(data) == 0x59d1d43c) {
            (bytes32 node, string memory key) = abi.decode(data[4:], (bytes32, string));
            return bytes(text(node, key, target));
        }
        if (bytes4(data) == 0xbc1c58d1) {
            (bytes32 node) = abi.decode(data[4:], (bytes32));
            return contenthash(node, target);
        }
    }

    /**
     * Returns the address associated with an ENS node.
     * @param node The ENS node to query.
     * @return The associated address.
     */
    function addr(bytes32 node, address target) public view returns (bytes memory) {
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

    /**
     * Returns the address associated with an ENS node.
     * @param node The ENS node to query.
     * @param coinType The cointype to query
     * @return The associated address.
     */
    function addr(
        bytes32 node,
        uint256 coinType,
        address target
    ) public view returns (bytes memory) {
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

    /**
     * Returns the text data associated with an ENS node and key.
     * @param node The ENS node to query.
     * @param key The text data key to query.
     * @return The associated text data.
     */
    function text(
        bytes32 node,
        string memory key,
        address target
    ) public view returns (bytes memory) {
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

    /**
     * Returns the contenthash associated with an ENS node.
     * @param node The ENS node to query.
     * @return The associated contenthash.
     */
    function contenthash(bytes32 node, address target) public view returns (bytes memory) {
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

}
