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
 * The proofService class can be used to calculate proofs for a given target and slot on the Arbitrum network.
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

        //We fetch the node created event for the node index we just retrieved.
        const nodeEventFilter = await this.rollup.filters.NodeCreated(nodeIndex);
        const nodeEvents = await this.rollup.queryFilter(nodeEventFilter);
        //Ethers v6 handles events differntly from v5. It dosent seem to decode the events like in v5. Which makes it pretty different to deal with a compley event like the NodeCreated event. 
        //I'm certain that there are ways to encode the data with ethers v6 but i havent them figured out yet
        //TODO refactor to use ethers v6
        const assertion = nodeEvents[0].args!.assertion

        //The assertion contains all information we need. Unfurtunately, the encoded hence the assertionHelper is used to decode it.
        //TODO refactor use AbiCoder instead of assertionHelper  
        const sendRoot = await this.assertionHelper.getSendRoot(assertion)
        const blockHash = await this.assertionHelper.getBlockHash(assertion)

        //The L1 rollup only provides us with the block hash. In order to ensure that the stateRoot we're using for the proof is indeed part of the block, we need to fetch the block. And provide it to the proof.
        const l2blockRaw = await this.l2LegacyProvider.send('eth_getBlockByHash', [
            blockHash,
            false
        ]);
        //RLP encoder has problems with bigint types from v6. So v5 is used here as well 
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

        //Rlp encode the block to pass it as an argument
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
