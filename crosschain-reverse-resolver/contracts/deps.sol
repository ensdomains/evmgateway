import {L1Verifier} from '@ensdomains/l1-verifier/contracts/L1Verifier.sol';
import '@ensdomains/ens-contracts/contracts/resolvers/OwnedResolver.sol';
import '@ensdomains/ens-contracts/contracts/reverseRegistrar/L2ReverseRegistrar.sol';

// Storage slot
// ┌───────────────────────┬──────────────────────────────┬──────────────┬
// │      contract         │        state_variable        │ storage_slot │
// ├───────────────────────┼──────────────────────────────┼──────────────│
// │  L2ReverseRegistrar   │            _owner            │      0       │
// │  L2ReverseRegistrar   │        recordVersions        │      1       │
// │  L2ReverseRegistrar   │         lastUpdated          │      2       │
// │  L2ReverseRegistrar   │      versionable_texts       │      3       │
// │  L2ReverseRegistrar   │      versionable_names       │      4       │
// │ L2ReverseResolverBase │        recordVersions        │      0       │
