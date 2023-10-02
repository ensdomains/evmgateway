import { AbiCoder, ethers } from 'ethers';

import { EVMProofHelper } from './EVMProofHelper';
import { IProofService } from './IProofService';
import { Block } from '@ethereumjs/block';

export type L1ProvableBlock = number;

/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Optimism Bedrock network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class L1ProofService implements IProofService<L1ProvableBlock> {
    private readonly provider: ethers.JsonRpcProvider;
    private readonly helper: EVMProofHelper;

    constructor(provider: ethers.JsonRpcProvider) {
        this.provider = provider;
        this.helper = new EVMProofHelper(provider);
    }

    /**
     * @dev Returns an object representing a block whose state can be proven on L1.
     */
    getProvableBlock(): Promise<L1ProvableBlock> {
        return this.helper.getProvableBlock();
    }

    /**
     * @dev Returns the value of a contract state slot at the specified block
     * @param block A `ProvableBlock` returned by `getProvableBlock`.
     * @param address The address of the contract to fetch data from.
     * @param slot The slot to fetch.
     * @returns The value in `slot` of `address` at block `block`
     */
    getStorageAt(block: L1ProvableBlock, address: ethers.AddressLike, slot: bigint): Promise<string> {
        return this.helper.getStorageAt(block, address, slot);
    }

    /**
     * @dev Fetches a set of proofs for the requested state slots.
     * @param block A `ProvableBlock` returned by `getProvableBlock`.
     * @param address The address of the contract to fetch data from.
     * @param slots An array of slots to fetch data for.
     * @returns A proof of the given slots, encoded in a manner that this service's
     *   corresponding decoding library will understand.
     */
    async getProofs(blockNo: L1ProvableBlock, address: ethers.AddressLike, slots: bigint[]): Promise<string> {
        const proof = await this.helper.getProofs(blockNo, address, slots);
        const rpcBlock = await this.provider.getBlock(blockNo);
        const block = Block.fromRPC(rpcBlock as any);
        const blockHeader = ethers.encodeRlp(block.header.raw() as any);
        return AbiCoder.defaultAbiCoder().encode([
            'tuple(uint256 blockNo, bytes blockHeader)',
            'tuple(bytes stateTrieWitness, bytes[] storageProofs)'
        ], [
            {blockNo, blockHeader},
            proof
        ]);
    }
}