import {L1Verifier} from '@ensdomains/l1-verifier/contracts/L1Verifier.sol';
import '@ensdomains/ens-contracts/contracts/reverseRegistrar/L2ReverseRegistrar.sol';
import '@ensdomains/ens-contracts/contracts/resolvers/profiles/IVersionableResolver.sol';
// Storage slot
// ┌────────────────────┬───────────────────┬──────────────┬
// │      contract      │  state_variable   │ storage_slot │
// ├────────────────────┼───────────────────┼──────────────┼
// │ L2ReverseRegistrar │    lastUpdated    │      0       │
// │ L2ReverseRegistrar │ versionable_texts │      1       │
// │ L2ReverseRegistrar │ versionable_names │      2       │
// │ L2ReverseRegistrar │  recordVersions   │      3       │
