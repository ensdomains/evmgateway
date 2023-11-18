/* eslint-disable prettier/prettier */
import { EVMProofHelper, type IProofService } from '@ensdomains/evm-gateway';
import { AbiCoder, ethers, type AddressLike } from 'ethers';
import { ethers as ethers5 } from "ethers5";
import helperAbi from "./abi/helperAbi.js";
import rollupAbi from "./abi/rollupABI.js";
export interface ArbProvableBlock {
    number: number

    sendRoot: string,
    blockHash: string,
    nodeIndex: string,
    rlpEncodedBlock: string
}


/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Optimism Bedrock network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class ArbProofService implements IProofService<ArbProvableBlock> {
    private readonly l2LegacyProvider: ethers5.providers.JsonRpcProvider;
    private readonly rollup: ethers5.Contract;
    private readonly assertionHelper: ethers5.Contract;
    private readonly helper: EVMProofHelper;

    constructor(
        l2Provider: ethers.JsonRpcProvider,
        l1LegacyProvider: ethers5.providers.JsonRpcProvider,
        l2LegacyProvider: ethers5.providers.JsonRpcProvider,
        l2RollupAddress: string,
        assertionHelperAddress: string
    ) {
        this.l2LegacyProvider = l2LegacyProvider;
        this.rollup = new ethers5.Contract(
            l2RollupAddress,
            rollupAbi,

        );
        this.helper = new EVMProofHelper(l2Provider);
        this.rollup = new ethers5.Contract(l2RollupAddress, rollupAbi, l1LegacyProvider)
        this.assertionHelper = new ethers5.Contract(assertionHelperAddress, helperAbi, l2LegacyProvider)


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
        console.log("input block", block)
        const proof = await this.helper.getProofs(block.number, address, slots);


        return AbiCoder.defaultAbiCoder().encode(
            [
                'tuple(bytes32 version, bytes32 sendRoot, bytes32 blockHash,uint64 nodeIndex,bytes rlpEncodedBlock)',
                'tuple(bytes[] stateTrieWitness, bytes[][] storageProofs)',
            ],
            [
                {
                    version:
                        '0x0000000000000000000000000000000000000000000000000000000000000000',
                    sendRoot: block.sendRoot,
                    blockHash: block.blockHash,
                    nodeIndex: block.nodeIndex,
                    rlpEncodedBlock: block.rlpEncodedBlock
                },
                proof,
            ]
        );
    }

    public async getProvableBlock(): Promise<ArbProvableBlock> {
        const nodeIndex = await this.rollup.latestNodeCreated()

        const nodeEventFilter = await this.rollup.filters.NodeCreated(nodeIndex);
        const nodeEvents = await this.rollup.queryFilter(nodeEventFilter) as any;
        const assertion = nodeEvents[0].args!.assertion

        const sendRoot = await this.assertionHelper.getSendRoot(assertion)
        const blockHash = await this.assertionHelper.getBlockHash(assertion)

        const l2blockRaw = await this.l2LegacyProvider.send('eth_getBlockByHash', [
            blockHash,
            false
        ]);

        const blockarray = [
            l2blockRaw.parentHash,
            l2blockRaw.sha3Uncles,
            l2blockRaw.miner,
            l2blockRaw.stateRoot,
            l2blockRaw.transactionsRoot,
            l2blockRaw.receiptsRoot,
            l2blockRaw.logsBloom,
            ethers5.BigNumber.from(l2blockRaw.difficulty).toHexString(),
            ethers5.BigNumber.from(l2blockRaw.number).toHexString(),
            ethers5.BigNumber.from(l2blockRaw.gasLimit).toHexString(),
            ethers5.BigNumber.from(l2blockRaw.gasUsed).toHexString(),
            ethers5.BigNumber.from(l2blockRaw.timestamp).toHexString(),
            l2blockRaw.extraData,
            l2blockRaw.mixHash,
            l2blockRaw.nonce,
            ethers5.BigNumber.from(l2blockRaw.baseFeePerGas).toHexString(),
        ]


        const rlpEncodedBlock = ethers.encodeRlp(blockarray)

        return {
            rlpEncodedBlock,
            sendRoot,
            blockHash,
            nodeIndex: nodeIndex.toNumber(),
            number: ethers5.BigNumber.from(l2blockRaw.number).toNumber(),
        }
    }


}
