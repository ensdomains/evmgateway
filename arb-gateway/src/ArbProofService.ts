/* eslint-disable prettier/prettier */
import { EVMProofHelper, type IProofService } from '@ensdomains/evm-gateway';
import { AbiCoder, Contract, Interface, JsonRpcProvider, type AddressLike, type Filter } from 'ethers';

export interface ArbProvableBlock {
    stateRoot: string;
    hash: string;
    number: number

}
const SEND_ROOT_UPDATED_EVENT_TOPIC = "0xb4df3847300f076a369cd76d2314b470a1194d9e8a6bb97f1860aee88a5f6748"

const OUTBOX_ABI = [
    "event SendRootUpdated(bytes32 indexed outputRoot, bytes32 indexed l2BlockHash)",
];

/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Optimism Bedrock network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class ArbProofService implements IProofService<ArbProvableBlock> {
    private readonly l1Provider: JsonRpcProvider;
    private readonly l2Provider: JsonRpcProvider;
    private readonly l2Outbox: Contract;
    private readonly helper: EVMProofHelper;

    constructor(
        l1Provider: JsonRpcProvider,
        l2Provider: JsonRpcProvider,
        l2OutboxAddress: string,
    ) {
        this.l1Provider = l1Provider;
        this.l2Provider = l2Provider;
        this.l2Outbox = new Contract(
            l2OutboxAddress,
            OUTBOX_ABI,
            l1Provider
        );
        this.helper = new EVMProofHelper(l2Provider);


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

        console.log("target block", block.number)
        console.log(proof)
        return AbiCoder.defaultAbiCoder().encode(
            [
                'tuple(tuple(bytes32 version, bytes32 stateRoot, bytes32 latestBlockhash) outputRootProof)',
                'tuple(bytes[] stateTrieWitness, bytes[][] storageProofs)',
            ],
            [
                {
                    blockNo: block.number,
                    outputRootProof: {
                        version:
                            '0x0000000000000000000000000000000000000000000000000000000000000000',
                        stateRoot: block.stateRoot,
                        latestBlockhash: block.hash,
                    },
                },
                proof,
            ]
        );
    }

    public async getProvableBlock(): Promise<ArbProvableBlock> {
        const latestBlocknr = await this.l1Provider.getBlockNumber()

        const filter: Filter = {
            fromBlock: latestBlocknr - 1000,
            toBlock: latestBlocknr,
            address: this.l2Outbox.getAddress(),
            topics: [SEND_ROOT_UPDATED_EVENT_TOPIC]
        };

        const iface = new Interface(OUTBOX_ABI)

        const logs = await this.l1Provider.getLogs(filter);
        const latestLog = logs[logs.length - 1];

        const e = iface.parseLog({
            topics: [...latestLog.topics],
            data: latestLog.data
        })

        if (!e) {
            throw new Error("No event found")
        }
        const [stateRoot, l2BlockHash] = e.args

        const l2Block = await this.l2Provider.getBlock(l2BlockHash)

        if (!l2Block) {
            throw new Error("No block found")
        }


        return {
            hash: l2BlockHash,
            number: l2Block.number,
            stateRoot: stateRoot
        }

    }
}
