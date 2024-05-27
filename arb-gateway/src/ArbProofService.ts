/* eslint-disable prettier/prettier */
import { EVMProofHelper, convertIntoMerkleTrieProof, type IProofService } from '@ensdomains/evm-gateway';
import { AbiCoder, Contract, EventLog, ethers, toBeHex, type AddressLike, toNumber } from 'ethers';
import rollupAbi from "./abi/rollupABI.js";
import type { IBlockCache } from './blockCache/IBlockCache.js';
export interface ArbProvableBlock {
    number: number
    sendRoot: string,
    nodeIndex: string,
    rlpEncodedBlock: string
}


/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Arbitrum network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class ArbProofService implements IProofService<ArbProvableBlock> {
    private readonly l2Provider: ethers.JsonRpcProvider;
    private readonly rollup: Contract;
    private readonly helper: EVMProofHelper;
    private readonly cache: IBlockCache;


    constructor(
        l1Provider: ethers.JsonRpcProvider,
        l2Provider: ethers.JsonRpcProvider,
        l2RollupAddress: string,
        cache: IBlockCache

    ) {
        this.l2Provider = l2Provider;
        this.rollup = new Contract(
            l2RollupAddress,
            rollupAbi,
            l1Provider
        );
        this.helper = new EVMProofHelper(l2Provider);
        this.cache = cache
    }

    async getStorageAt(block: ArbProvableBlock, address: AddressLike, slot: bigint): Promise<string> {
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
        block: ArbProvableBlock,
        address: AddressLike,
        slots: bigint[]
    ): Promise<string> {
        const proof = await this.helper.getProofs(block.number, address, slots);

        return AbiCoder.defaultAbiCoder().encode(
            [
                'tuple(bytes32 version, bytes32 sendRoot, uint64 nodeIndex,bytes rlpEncodedBlock)',
                'tuple(bytes stateTrieWitness, bytes[] storageProofs)',
            ],
            [
                {
                    version:
                        '0x0000000000000000000000000000000000000000000000000000000000000000',
                    sendRoot: block.sendRoot,
                    nodeIndex: block.nodeIndex,
                    rlpEncodedBlock: block.rlpEncodedBlock
                },
                convertIntoMerkleTrieProof(proof)
            ]
        );
    }
    /**
    * Retrieves information about the latest provable block in the Arbitrum Rollup.
    *
    * @returns { Promise<ArbProvableBlock> } A promise that resolves to an object containing information about the provable block.
    * @throws Throws an error if any of the underlying operations fail.
    *
    * @typedef { Object } ArbProvableBlock
    * @property { string } rlpEncodedBlock - The RLP - encoded block information.
    * @property { string } sendRoot - The send root of the provable block.
    * @property { string } blockHash - The hash of the provable block.
    * @property { number } nodeIndex - The index of the node corresponding to the provable block.
    * @property { number } number - The block number of the provable block.
    */
    public async getProvableBlock(): Promise<ArbProvableBlock> {
        //Retrieve the latest pending node that has been committed to the rollup.
        const nodeIndex = await this.rollup.latestNodeCreated()
        const [l2blockRaw, sendRoot] = await this.getL2BlockForNode(nodeIndex)

        const blockarray = [
            l2blockRaw.parentHash,
            l2blockRaw.sha3Uncles,
            l2blockRaw.miner,
            l2blockRaw.stateRoot,
            l2blockRaw.transactionsRoot,
            l2blockRaw.receiptsRoot,
            l2blockRaw.logsBloom,
            toBeHex(l2blockRaw.difficulty),
            toBeHex(l2blockRaw.number),
            toBeHex(l2blockRaw.gasLimit),
            toBeHex(l2blockRaw.gasUsed),
            toBeHex(l2blockRaw.timestamp),
            l2blockRaw.extraData,
            l2blockRaw.mixHash,
            l2blockRaw.nonce,
            toBeHex(l2blockRaw.baseFeePerGas)
        ]

        //Rlp encode the block to pass it as an argument
        const rlpEncodedBlock = ethers.encodeRlp(blockarray)

        return {
            rlpEncodedBlock,
            sendRoot,
            nodeIndex: nodeIndex,
            number: toNumber(l2blockRaw.number)
        }
    }
    /**
     * Fetches the corrospending L2 block for a given node index and returns it along with the send root.
     * @param {bigint} nodeIndex - The index of the node for which to fetch the block.
     * @returns {Promise<[Record<string, string>, string]>} A promise that resolves to a tuple containing the fetched block and the send root.
     */
    private async getL2BlockForNode(nodeIndex: bigint): Promise<[Record<string, string>, string]> {

        //We first check if we have the block cached
        const cachedBlock = await this.cache.getBlock(nodeIndex)
        if (cachedBlock) {
            return [cachedBlock.block, cachedBlock.sendRoot]
        }

        //We fetch the node created event for the node index we just retrieved.
        const nodeEventFilter = await this.rollup.filters.NodeCreated(nodeIndex);
        const nodeEvents = await this.rollup.queryFilter(nodeEventFilter);
        const assertion = (nodeEvents[0] as EventLog).args!.assertion
        //Instead of using the AssertionHelper contract we can extract sendRoot from the assertion. Avoiding the deployment of the AssertionHelper contract and an additional RPC call.
        const [blockHash, sendRoot] = assertion[1][0][0]


        //The L1 rollup only provides us with the block hash. In order to ensure that the stateRoot we're using for the proof is indeed part of the block, we need to fetch the block. And provide it to the proof.
        const l2blockRaw = await this.l2Provider.send('eth_getBlockByHash', [
            blockHash,
            false
        ]);

        //Cache the block for future use
        await this.cache.setBlock(nodeIndex, l2blockRaw, sendRoot)

        return [l2blockRaw, sendRoot]
    }

}
