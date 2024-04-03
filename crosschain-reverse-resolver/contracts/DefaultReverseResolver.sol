pragma solidity >=0.8.4;

import "./IDefaultReverseResolver.sol";
import "@ensdomains/ens-contracts/contracts/reverseRegistrar/SignatureReverseResolver.sol";
import "@ensdomains/ens-contracts/contracts/wrapper/BytesUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ITextResolver} from "@ensdomains/ens-contracts/contracts/resolvers/profiles/ITextResolver.sol";
import {INameResolver} from "@ensdomains/ens-contracts/contracts/resolvers/profiles/INameResolver.sol";
import "@ensdomains/ens-contracts/contracts/utils/HexUtils.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/IExtendedResolver.sol";

/**
 * A fallback reverser resolver to resolve when L2 reverse resolver has no names set.
 * The contract will be set under "default.reverse" namespace
 * It can only be set by EOA as contract accounts are chain dependent.
 */
contract DefaultReverseResolver is
    Ownable,
    IDefaultReverseResolver,
    IExtendedResolver,
    ERC165,
    SignatureReverseResolver
{
    uint256 constant ADDRESS_LENGTH = 40;
    using ECDSA for bytes32;
    using BytesUtils for bytes;
    // The namehash of 'default.reverse'
    bytes32 private constant DEFAULT_REVERSE_NODE =
        0x53a2e7cce84726721578c676b4798972d354dd7c62c832415371716693edd312;

    /**
     * @dev Constructor
     */
    constructor() SignatureReverseResolver(DEFAULT_REVERSE_NODE, 0) {}

    function isAuthorised(address addr) internal view override returns (bool) {
        if (addr != msg.sender) {
            revert Unauthorised();
        }
    }

    /*
     * Returns the name associated with an address, for reverse records.
     * This function is non ENSIP standard
     * @param address The ENS address to query.
     * @return The associated name.
     */
    function name(address addr) public view returns (string memory) {
        bytes32 node = _getNamehash(addr);
        return versionable_names[recordVersions[node]][node];
    }

    /*
     * Returns the text data associated with an address and key.
     * @param address The ENS address to query.
     * @param key The text data key to query.
     * @return The associated text data.
     */
    function text(
        address addr,
        string memory key
    ) public view override returns (string memory) {
        bytes32 node = _getNamehash(addr);
        return versionable_texts[recordVersions[node]][node][key];
    }

    /*
     * @dev Resolve and verify a record stored in l2 target address. It supports fallback to the default resolver
     * @param name DNS encoded ENS name to query
     * @param data The actual calldata
     * @return result result of the call
     */
    function resolve(bytes calldata _name, bytes calldata data) external view returns (bytes memory result) {
        bytes4 selector = bytes4(data);
        (address addr,bool valid) = HexUtils.hexToAddress(_name, 1, ADDRESS_LENGTH + 1);
        require(valid, "Invalid address");

        if (selector == INameResolver.name.selector) {
            return bytes(name(addr));
        }
        if (selector == ITextResolver.text.selector) {
            (,string memory key) = abi.decode(data[4:], (bytes32, string));
            return bytes(text(addr, key));
        }
    }

    function supportsInterface(
        bytes4 interfaceID
    ) public view override(ERC165, SignatureReverseResolver) returns (bool) {
        return
            interfaceID == type(IDefaultReverseResolver).interfaceId ||
            interfaceID == type(IExtendedResolver).interfaceId ||
            super.supportsInterface(interfaceID);
    }
}
