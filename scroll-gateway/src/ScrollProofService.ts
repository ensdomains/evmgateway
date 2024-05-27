/* eslint-disable prettier/prettier */
import { EVMProofHelper, type IProofService } from '@ensdomains/evm-gateway';
import { AbiCoder, concat, ethers, type AddressLike, } from 'ethers';

export interface ScrollProvableBlock {
    number: number
}

/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Scroll network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class ScrollProofService implements IProofService<ScrollProvableBlock> {
    private readonly l2Provider: ethers.JsonRpcProvider;
    private readonly helper: EVMProofHelper;
    private readonly searchUrl: string;

    constructor(
        searchUrl: string,
        l2Provider: ethers.JsonRpcProvider,
    ) {
        this.l2Provider = l2Provider;
        this.helper = new EVMProofHelper(l2Provider);
        this.searchUrl = searchUrl;
    }

    async getStorageAt(block: ScrollProvableBlock, address: AddressLike, slot: bigint): Promise<string> {
        return this.helper.getStorageAt(block.number, address, slot);
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
        block: ScrollProvableBlock,
        address: AddressLike,
        slots: bigint[]
    ): Promise<string> {
        const { batch_index: batchIndex } = await (
            await fetch(`${this.searchUrl}?keyword=${Number(block.number)}`)
        ).json();
        const proof = await this.helper.getProofs(Number(block.number), address, slots);
        const compressedProofs: string[] = [];
        const accountProof: string = proof.stateTrieWitness;
        for (let index = 0; index < proof.storageProofs.length; index++) {
            const storageProof: string = proof.storageProofs[index];
            compressedProofs[index] = concat([
                `0x${accountProof.length.toString(16).padStart(2, "0")}`,
                ...accountProof,
                `0x${storageProof.length.toString(16).padStart(2, "0")}`,
                ...storageProof,
            ]);
        }
        return AbiCoder.defaultAbiCoder().encode(
            [
                'tuple(uint256 batchIndex)',
                'tuple(bytes[] storageProofs)',
            ],
            [
                {
                    batchIndex
                },
                {
                    storageProofs:compressedProofs
                },
            ]
        );
    }
  /**
   * @dev Returns an object representing a block whose state can be proven on L1.
   */
  public async getProvableBlock(): Promise<ScrollProvableBlock> {
        const block = await this.l2Provider.send("eth_getBlockByNumber", ["finalized", false]);
        if (!block) throw new Error('No block found');
        return {
            number: block.number
        };
    }
}
