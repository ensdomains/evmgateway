import { toBeHex, type AddressLike, type JsonRpcProvider } from 'ethers';

/**
 * Response of the eth_getProof RPC method.
 */
interface EthGetProofResponse {
  accountProof: string[];
  balance: string;
  codeHash: string;
  nonce: string;
  storageHash: string;
  storageProof: {
    key: string;
    value: string;
    proof: string[];
  }[];
}

export interface StateProof {
  stateTrieWitness: string[];
  storageProofs: string[][];
  stateRoot: string;
}

/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Optimism Bedrock network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class EVMProofHelper {
  private readonly provider: JsonRpcProvider;

  constructor(provider: JsonRpcProvider) {
    this.provider = provider;
  }

  /**
   * @dev Returns the value of a contract state slot at the specified block
   * @param block A `ProvableBlock` returned by `getProvableBlock`.
   * @param address The address of the contract to fetch data from.
   * @param slot The slot to fetch.
   * @returns The value in `slot` of `address` at block `block`
   */
  getStorageAt(
    blockNo: number,
    address: AddressLike,
    slot: bigint
  ): Promise<string> {
    return this.provider.getStorage(address, slot, blockNo);
  }

  /**
   * @dev Fetches a set of proofs for the requested state slots.
   * @param block A `ProvableBlock` returned by `getProvableBlock`.
   * @param address The address of the contract to fetch data from.
   * @param slots An array of slots to fetch data for.
   * @returns A proof of the given slots, encoded in a manner that this service's
   *   corresponding decoding library will understand.
   */
  async getProofs(
    blockNo: number,
    address: AddressLike,
    slots: bigint[]
  ): Promise<StateProof> {
    const args = [
      address,
      slots.map((slot) => toBeHex(slot, 32)),
      '0x' + blockNo.toString(16),
    ];
    const proofs: EthGetProofResponse = await this.provider.send(
      'eth_getProof',
      args
    );
    return {
      stateTrieWitness: proofs.accountProof,
      storageProofs: proofs.storageProof.map((proof) => proof.proof),
      stateRoot: proofs.storageHash,
    };
  }
}
