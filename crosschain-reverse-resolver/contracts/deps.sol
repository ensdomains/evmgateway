import {L1Verifier} from '@ensdomains/l1-verifier/contracts/L1Verifier.sol';
import '@ensdomains/ens-contracts/contracts/resolvers/OwnedResolver.sol';
import '@ensdomains/ens-contracts/contracts/reverseRegistrar/L2ReverseRegistrar.sol';

// Storage slot
// ┌─────────────────────┬──────────────────────────────┬──────────────┬
// │      contract       │        state_variable        │ storage_slot │
// ├─────────────────────┼──────────────────────────────┼──────────────┼
// |    OwnedResolver    │            _owner            │      0       │
// │    OwnedResolver    │        recordVersions        │      1       │
// │    OwnedResolver    │       versionable_abis       │      2       │
// │    OwnedResolver    │    versionable_addresses     │      3       │
// │    OwnedResolver    │      versionable_hashes      │      4       │
// │    OwnedResolver    │    versionable_zonehashes    │      5       │
// │    OwnedResolver    │     versionable_records      │      6       │
// │    OwnedResolver    │ versionable_nameEntriesCount │      7       │
// │    OwnedResolver    │    versionable_interfaces    │      8       │
// │    OwnedResolver    │      versionable_names       │      9       │
// │    OwnedResolver    │     versionable_pubkeys      │      10      │
// │    OwnedResolver    │      versionable_texts       │      11      │
