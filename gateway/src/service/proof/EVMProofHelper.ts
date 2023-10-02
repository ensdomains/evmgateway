import { ethers } from 'ethers';

import { EthGetProofResponse } from './types';

export interface StateProof {
    stateRoot: string;
    stateTrieWitness: string;
    storageProofs: string[];
}

/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Optimism Bedrock network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class EVMProofHelper {
    private readonly provider: ethers.JsonRpcProvider;

    constructor(provider: ethers.JsonRpcProvider) {
        this.provider = provider;
    }

    /**
     * @dev Returns an object representing a block whose state can be proven on L1.
     */
    getProvableBlock(): Promise<number> {
        return this.provider.getBlockNumber();
    }

    /**
     * @dev Returns the value of a contract state slot at the specified block
     * @param block A `ProvableBlock` returned by `getProvableBlock`.
     * @param address The address of the contract to fetch data from.
     * @param slot The slot to fetch.
     * @returns The value in `slot` of `address` at block `block`
     */
    getStorageAt(block: number, address: ethers.AddressLike, slot: bigint): Promise<string> {
        return this.provider.getStorage(address, slot, block);
    }

    /**
     * @dev Fetches a set of proofs for the requested state slots.
     * @param block A `ProvableBlock` returned by `getProvableBlock`.
     * @param address The address of the contract to fetch data from.
     * @param slots An array of slots to fetch data for.
     * @returns A proof of the given slots, encoded in a manner that this service's
     *   corresponding decoding library will understand.
     */
    async getProofs(block: number, address: ethers.AddressLike, slots: bigint[]): Promise<StateProof> {
        const { string: stateRoot } = (await this.provider.getBlock(block)) as any;
        const proofs: EthGetProofResponse = await this.provider.send('eth_getProof', [address, slots, block]);
        return {
            stateRoot,
            stateTrieWitness: ethers.encodeRlp(proofs.accountProof),
            storageProofs: proofs.storageProof.map((proof) => ethers.encodeRlp(proof.proof)),
        };
    }
}