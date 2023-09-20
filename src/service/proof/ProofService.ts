import { toRpcHexString } from '@eth-optimism/core-utils';
import { asL2Provider, CrossChainMessenger, L2Provider } from '@eth-optimism/sdk';
import { BigNumber, ethers } from 'ethers';
import { keccak256 } from 'ethers/lib/utils';

import { CreateProofResult, EthGetProofResponse, StorageProof } from './types';

export enum StorageLayout {
    /**
     * address,uint,bytes32,bool
     */
    FIXED,
    /**
     * array,bytes,string
     */
    DYNAMIC,
}

type bytes32 = string;
export interface OutputRootProof {
    version: bytes32;
    stateRoot: bytes32;
    messagePasserStorageRoot: bytes32;
    latestBlockhash: bytes32;
}

interface ProofInputObject {
    layout: StorageLayout;
    target: string;
    length: number;
    storageHash: string;
    stateTrieWitness: string;
    l2OutputIndex: number;
    outputRootProof: OutputRootProof;
    storageProofs: StorageProof[];
}


function serializeProof(proof: ProofInputObject) {
    return ethers.utils.defaultAbiCoder.encode([
        // From https://github.com/corpus-io/Ccip-Resolver/blob/main/contracts/verifier/optimism-bedrock/IBedrockProofVerifier.sol
        'uint8',
        'address',
        'uint256',
        'bytes32',
        'bytes',
        'uint256',
        // From https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/libraries/Types.sol
        'tuple(bytes32 version, bytes32 stateRoot, bytes32 messagePasserStorageRoot, bytes32 latestBlockhash)',
        'tuple(bytes32 key, bytes storageTrieWitness)[]'
    ], [
        proof.layout,
        proof.target,
        proof.length,
        proof.storageHash,
        proof.stateTrieWitness,
        proof.l2OutputIndex,
        proof.outputRootProof,
        proof.storageProofs
    ]);
}

/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Optimism Bedrock network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class ProofService {
    private readonly l1Provider: ethers.providers.StaticJsonRpcProvider;
    private readonly l2Provider: L2Provider<ethers.providers.StaticJsonRpcProvider>;
    private readonly crossChainMessenger: CrossChainMessenger;

    constructor(l1Provider: ethers.providers.StaticJsonRpcProvider, l2Provider: ethers.providers.JsonRpcProvider) {
        this.l1Provider = l1Provider;
        this.l2Provider = asL2Provider(l2Provider);

        this.crossChainMessenger = new CrossChainMessenger({
            l1ChainId: l1Provider.network.chainId,
            l2ChainId: l2Provider.network.chainId,
            l1SignerOrProvider: this.l1Provider,
            l2SignerOrProvider: this.l2Provider,
            bedrock: true,
        });
    }

    /**
     * Creates a {@see CreateProofResult} for a given target and slot.
     * @param target The address of the smart contract that contains the storage slot
     * @param slot The storage slot the proof should be created for
     */

    public async createProof(
        target: string,
        slot: string,
        layout: StorageLayout = StorageLayout.DYNAMIC,
    ): Promise<CreateProofResult> {
        /**
         * use the most recent block,posted to L1, to build the proof
         */
        const { l2OutputIndex, number, stateRoot, hash } = await this.getLatestProposedBlock();

        const { storageProof, storageHash, accountProof, length } = await this.getProofForSlot(
            slot,
            number,
            target,
            layout,
        );

        /**
         * The messengePasserStorageRoot is important for the verification on chain
         */
        const messagePasserStorageRoot = await this.getMessagePasserStorageRoot(number);

        const proof = {
            layout,
            // The contract address of the slot beeing proofed
            target,
            // The length actual length of the value
            length,
            // RLP encoded account proof
            stateTrieWitness: ethers.utils.RLP.encode(accountProof),
            // The state output the proof is beeing created for
            l2OutputIndex,
            // The storage hash of the target
            storageHash,
            // Bedrock OutputRootProof type
            outputRootProof: {
                version: ethers.constants.HashZero,
                stateRoot,
                messagePasserStorageRoot,
                latestBlockhash: hash,
            },
            // RLP encoded storage proof for every slot
            storageProofs: storageProof,
        };

        // The result is not part of the proof but its convenient to have it i:E in tests
        const result = storageProof
            .reduce((agg, cur) => agg + cur.value.substring(2), '0x')
            .substring(0, length * 2 + 2);
        return {
            result,
            proof: serializeProof(proof)
        };
    }
    /**
     * Retrieves the latest proposed block.
     * @returns An object containing the state root, hash, number, and L2 output index of the latest proposed block.
     * @throws An error if the state root for the block is not found.
     */
    private async getLatestProposedBlock() {
        /**
         * Get the latest ouput from the L2Oracle. We're building the proove with this batch
         * We go 5 batches backwards to avoid errors like delays between nodes
         *
         */

        const l2OutputIndex = (await this.crossChainMessenger.contracts.l1.L2OutputOracle.latestOutputIndex()).sub(5);
        /**
         *    struct OutputProposal {
         *       bytes32 outputRoot;
         *       uint128 timestamp;
         *       uint128 l2BlockNumber;
         *      }
         */
        const outputProposal = await this.crossChainMessenger.contracts.l1.L2OutputOracle.getL2Output(l2OutputIndex);

        /**
         * We're getting the block for that the output was created for. The stateRoot contains the storageRoot of the account we're prooving.
         */
        const { stateRoot, hash } = (await this.l2Provider.getBlock(outputProposal.l2BlockNumber.toNumber())) as any;

        /**
         * Although the stateRoot is not part of the ethers.Bock type it'll be returned by the Optimism RPC
         */
        if (!stateRoot) {
            throw new Error(`StateRoot for block ${outputProposal.l2BlockNumber.toNumber()} not found`);
        }

        return {
            stateRoot,
            hash,
            number: outputProposal.l2BlockNumber.toNumber(),
            l2OutputIndex: l2OutputIndex.toNumber(),
        };
    }

    /**
     * Gets the storage proof for a given slot based on the provided layout.
     * @param initalSlot - The initial slot.
     * @param blockNr - The block number.
     * @param resolverAddr - The resolver address.
     * @param layout - The storage layout (fixed or dynamic).
     * To get an better understanding how the storage layout looks like visit {@link https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html}
     * @returns The storage proof and related information.
     */
    private async getProofForSlot(
        initalSlot: string,
        blockNr: number,
        resolverAddr: string,
        layout: StorageLayout,
    ): Promise<{
        storageProof: (StorageProof & { value: string })[];
        accountProof: string;
        storageHash: string;
        length: number;
    }> {
        if (layout === StorageLayout.FIXED) {
            /**
             * A fixed slot always is a single slot
             */
            return this.handleShortType(resolverAddr, initalSlot, blockNr, 32);
        }

        /**
         * The initial value. We used it to determine how many slots we need to proof
         * See https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html#mappings-and-dynamic-arrays
         */
        const slotValue = await this.l2Provider.getStorageAt(resolverAddr, initalSlot, blockNr);
        /**
         * The length of the value is encoded in the last byte of the slot
         */
        const length = this.decodeLength(slotValue);

        /**
         * Handle slots at most 31 bytes long
         */
        if (length <= 31) {
            return this.handleShortType(resolverAddr, initalSlot, blockNr, length);
        }
        return this.handleLongType(initalSlot, resolverAddr, blockNr, length);
    }
    /**
     * Decodes the length of a storage slot based on the provided slot value. This is important to determine weher the slot is a short or long type.
     * @param slot - The storage slot value as a hexadecimal string.
     * @returns The decoded length of the storage slot.
     */
    private decodeLength(slot: string) {
        const lastByte = slot.substring(slot.length - 2);
        const lastBit = parseInt(lastByte, 16) % 2;

        /**
         * If the last bit is not set it is a short type
         */
        if (lastBit === 0) {
            /**
             * For short types the length can be encoded by calculating length / 2
             */
            return BigNumber.from('0x' + lastByte)
                .div(2)
                .toNumber();
        }
        /**
         * For long types the length can be encoded by calculating length *2+1
         */
        return BigNumber.from(slot).sub(1).div(2).toNumber();
    }
    /**
     * Handles the short type of storage layout (length <= 31).
     * @param resolverAddr - The resolver address.
     * @param slot - The storage slot value as a hexadecimal string.
     * @param blockNr - The block number.
     * @param length - The length of the slot (up to 31 bytes).
     * @returns An object containing the account proof, storage proof, storage hash, and length.
     */
    private async handleShortType(resolverAddr: string, slot: string, blockNr: number, length: number) {
        /**
         * Proving the short type is simple all we have to do is to call eth_getProof
         */
        const { storageProof, accountProof, storageHash } = await this.makeGetProofRpcCall(
            resolverAddr,
            [slot],
            blockNr,
        );

        return {
            accountProof,
            storageProof: this.rlpEncodeStroageProof(storageProof),
            storageHash,
            length,
        };
    }
    /**
     * Handles the long type of storage layout (length > 31).
     * @param initialSlot - The initial slot as a hexadecimal string, which contains the length of the entire data structure.
     * @param resolverAddr - The resolver address.
     * @param blockNr - The block number.
     * @param length - The length of the slot (greater than 31 bytes).
     * @returns An object containing the account proof, storage proof, storage hash, and length.
     */
    private async handleLongType(initialSlot: string, resolverAddr: string, blocknr: number, length: number) {
        /**
         * At first we need do determine how many slots we need to proof. The initial slot just contains the length of the entire data structure.
         * We're using this information to calculate the number of slots we need to request.
         */
        const totalSlots = Math.ceil((length * 2 + 1) / 64);

        /**
         * The first slot is the keccak256 hash of the initial slot. After that the slots are calculated by adding 1 to the previous slot.
         */
        const firstSlot = keccak256(initialSlot);

        /**
         * Computing the addresses of every other slot
         */
        const slots = [...Array(totalSlots).keys()].map(i => BigNumber.from(firstSlot).add(i).toHexString());

        /*
         * After we know every slot that has to be proven we can call eth_getProof.
         */
        const { accountProof, storageProof, storageHash } = await this.makeGetProofRpcCall(
            resolverAddr,
            slots,
            blocknr,
        );

        return {
            accountProof,
            storageProof: this.rlpEncodeStroageProof(storageProof),
            storageHash,
            length,
        };
    }
    /**
     * Retrieves the storage hash for the L2ToL1MessagePassercontract. This hash is part of every outputRoot posted by the L2OutputOracle.
     * To learn more about Bedrock commitments visit
     * @link {https://github.com/ethereum-optimism/optimism/blob/develop/specs/proposals.md#l2-output-commitment-construction}
     * @param blockNr The block number for which to fetch the storage hash.
     * @returns A promise that resolves to the storage hash.
     */
    private async getMessagePasserStorageRoot(blockNr: number) {
        const { storageHash } = await this.makeGetProofRpcCall(
            this.crossChainMessenger.contracts.l2.BedrockMessagePasser.address,
            [],
            blockNr,
        );

        return storageHash;
    }
    /**
     * Makes an RPC call to retrieve the proof for the specified resolver address, slots, and block number.
     * @param resolverAddr The resolver address for which to fetch the proof.
     * @param slots The slots for which to fetch the proof.
     * @param blocknr The block number for which to fetch the proof.
     * @returns A promise that resolves to the proof response.
     */
    private async makeGetProofRpcCall(
        resolverAddr: string,
        slots: string[],
        blocknr: number,
    ): Promise<EthGetProofResponse> {
        return this.l2Provider.send('eth_getProof', [resolverAddr, slots, toRpcHexString(blocknr)]);
    }
    /**
     * RLP encodes the storage proof
     * @param storageProofs The storage proofs to be mapped.
     * @returns An array of mapped storage proofs.
     */
    private rlpEncodeStroageProof(
        storageProofs: EthGetProofResponse['storageProof'],
    ): (StorageProof & { value: string })[] {
        return storageProofs.map(({ key, proof, value }) => ({
            key,
            value,
            // The contracts needs the merkle proof RLP encoded
            storageTrieWitness: ethers.utils.RLP.encode(proof),
        }));
    }
}