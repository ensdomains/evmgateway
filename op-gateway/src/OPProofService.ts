import {
  EVMProofHelper,
  convertIntoMerkleTrieProof,
  type IProofService,
} from '@ensdomains/evm-gateway';
import { type JsonRpcBlock } from '@ethereumjs/block';
import { AbiCoder, Contract, JsonRpcProvider, type AddressLike } from 'ethers';

export interface OPProvableBlock {
  number: number;
  l2OutputIndex: number;
}

const L2_OUTPUT_ORACLE_ABI = [
  'function latestOutputIndex() external view returns (uint256)',
  'function getL2Output(uint256 _l2OutputIndex) external view returns (tuple(bytes32 outputRoot, uint128 timestamp, uint128 l2BlockNumber))',
];

const L2_TO_L1_MESSAGE_PASSER_ADDRESS =
  '0x4200000000000000000000000000000000000016';

/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Optimism Bedrock network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class OPProofService implements IProofService<OPProvableBlock> {
  private readonly l2OutputOracle: Contract;
  private readonly l2Provider: JsonRpcProvider;
  private readonly helper: EVMProofHelper;
  private readonly delay: number;

  constructor(
    l1Provider: JsonRpcProvider,
    l2Provider: JsonRpcProvider,
    l2OutputOracleAddress: string,
    delay: number
  ) {
    this.l2Provider = l2Provider;
    this.helper = new EVMProofHelper(l2Provider);
    this.delay = delay;
    this.l2OutputOracle = new Contract(
      l2OutputOracleAddress,
      L2_OUTPUT_ORACLE_ABI,
      l1Provider
    );
  }

  /**
   * @dev Returns an object representing a block whose state can be proven on L1.
   */
  async getProvableBlock(): Promise<OPProvableBlock> {
    /**
     * Get the latest output from the L2Oracle. We're building the proof with this batch
     * We go a few batches backwards to avoid errors like delays between nodes
     *
     */
    const l2OutputIndex =
      Number(await this.l2OutputOracle.latestOutputIndex()) - this.delay;

    /**
     *    struct OutputProposal {
     *       bytes32 outputRoot;
     *       uint128 timestamp;
     *       uint128 l2BlockNumber;
     *      }
     */
    const outputProposal = await this.l2OutputOracle.getL2Output(l2OutputIndex);

    return {
      number: outputProposal.l2BlockNumber,
      l2OutputIndex: l2OutputIndex,
    };
  }

  /**
   * @dev Returns the value of a contract state slot at the specified block
   * @param block A `ProvableBlock` returned by `getProvableBlock`.
   * @param address The address of the contract to fetch data from.
   * @param slot The slot to fetch.
   * @returns The value in `slot` of `address` at block `block`
   */
  getStorageAt(
    block: OPProvableBlock,
    address: AddressLike,
    slot: bigint
  ): Promise<string> {
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
    block: OPProvableBlock,
    address: AddressLike,
    slots: bigint[]
  ): Promise<string> {
    const proof = await this.helper.getProofs(block.number, address, slots);
    const rpcBlock: JsonRpcBlock = await this.l2Provider.send(
      'eth_getBlockByNumber',
      ['0x' + block.number.toString(16), false]
    );
    const messagePasserStorageRoot = await this.getMessagePasserStorageRoot(
      block.number
    );

    return AbiCoder.defaultAbiCoder().encode(
      [
        'tuple(uint256 l2OutputIndex, tuple(bytes32 version, bytes32 stateRoot, bytes32 messagePasserStorageRoot, bytes32 latestBlockhash) outputRootProof)',
        'tuple(bytes stateTrieWitness, bytes[] storageProofs)',
      ],
      [
        {
          blockNo: block.number,
          l2OutputIndex: block.l2OutputIndex,
          outputRootProof: {
            version:
              '0x0000000000000000000000000000000000000000000000000000000000000000',
            stateRoot: rpcBlock.stateRoot,
            messagePasserStorageRoot,
            latestBlockhash: rpcBlock.hash,
          },
        },
        convertIntoMerkleTrieProof(proof),
      ]
    );
  }

  private async getMessagePasserStorageRoot(blockNo: number) {
    const { stateRoot } = await this.helper.getProofs(
      blockNo,
      L2_TO_L1_MESSAGE_PASSER_ADDRESS,
      []
    );
    return stateRoot;
  }
}
