import "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import "@ensdomains/ens-contracts/contracts/wrapper/NameWrapper.sol";
import "@ensdomains/ens-contracts/contracts/ethregistrar/BaseRegistrarImplementation.sol";
import "@ensdomains/ens-contracts/contracts/wrapper/StaticMetadataService.sol";
import "@ensdomains/l1-verifier/contracts/L1Verifier.sol";
import {ReverseRegistrar} from "@ensdomains/ens-contracts/contracts/reverseRegistrar/ReverseRegistrar.sol";
import {PublicResolver} from "@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol";
import {DelegatableResolver} from "@ensdomains/ens-contracts/contracts/resolvers/DelegatableResolver.sol";
import {DelegatableResolverFactory} from "@ensdomains/ens-contracts/contracts/resolvers/DelegatableResolverFactory.sol";
// Storage slot
// ┌────────────────────────────┬──────────────────────────────┬──────────────┬
// │      contract              │        state_variable        │ storage_slot │ 
// ├────────────────────────────┼──────────────────────────────┼──────────────┼
// │    DelegatableResolver     │        recordVersions        │      0       │
// │    DelegatableResolver     │       versionable_abis       │      1       │
// │    DelegatableResolver     │    versionable_addresses     │      2       │
// │    DelegatableResolver     │      versionable_hashes      │      3       │
// │    DelegatableResolver     │    versionable_zonehashes    │      4       │
// │    DelegatableResolver     │     versionable_records      │      5       │
// │    DelegatableResolver     │ versionable_nameEntriesCount │      6       │
// │    DelegatableResolver     │    versionable_interfaces    │      7       │
// │    DelegatableResolver     │      versionable_names       │      8       │
// │    DelegatableResolver     │     versionable_pubkeys      │      9       │
// │    DelegatableResolver     │      versionable_texts       │      10      │
// │    DelegatableResolver     │          operators           │      11      │
// │ DelegatableResolverFactory │        implementation        │      0       │
