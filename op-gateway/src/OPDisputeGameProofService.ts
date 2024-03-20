import { EVMProofHelper, type IProofService } from '@ensdomains/evm-gateway';
import { type JsonRpcBlock } from '@ethereumjs/block';
import { AbiCoder, Contract, JsonRpcProvider, type AddressLike } from 'ethers';

export interface OPProvableBlock {
  number: number;
  disputeGameIndex: number;
}

const DISPUTE_GAME_FACTORY_ABI = [
  'function gameAtIndex(uint256 _index) external view returns (uint32 gameType_, uint64 timestamp_, address proxy_)',
  'function gameCount() external view returns (uint256 gameCount_)',
  // TODO: Use findLatestGames instead
];

const FAULT_DISPUTE_GAME_ABI = [
  // The l2BlockNumber of the disputed output root in the `L2OutputOracle`.
  'function l2BlockNumber() external view returns (uint256 l2BlockNumber_)',
  // The output root of the game
  'function rootClaim() external pure returns returns (bytes32 rootClaim_)',
];

const L2_TO_L1_MESSAGE_PASSER_ADDRESS =
  '0x4200000000000000000000000000000000000016';

/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Optimism Bedrock network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class OPDisputeGameProofService implements IProofService<OPProvableBlock> {
  private readonly disputeGameFactory: Contract;
  private readonly l1Provider: JsonRpcProvider;
  private readonly l2Provider: JsonRpcProvider;
  private readonly helper: EVMProofHelper;
  private readonly delay: number;

  constructor(
    l1Provider: JsonRpcProvider,
    l2Provider: JsonRpcProvider,
    disputeGameFactoryAddress: string,
    delay: number
  ) {
    this.l1Provider = l1Provider;
    this.l2Provider = l2Provider;
    this.helper = new EVMProofHelper(l2Provider);
    this.delay = delay;
    this.disputeGameFactory = new Contract(
      disputeGameFactoryAddress,
      DISPUTE_GAME_FACTORY_ABI,
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
    const disputeGameIndex =
      Number(await this.disputeGameFactory.gameCount()) - this.delay;

    const game = await this.disputeGameFactory.gameAtIndex(disputeGameIndex);

    const disputeGame = new Contract(
      game[2],
      FAULT_DISPUTE_GAME_ABI,
      this.l1Provider,
    );

    const l2BlockNumber = await disputeGame.l2BlockNumber();

    return {
      number: l2BlockNumber,
      disputeGameIndex: disputeGameIndex,
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
        'tuple(uint256 disputeGameIndex, tuple(bytes32 version, bytes32 stateRoot, bytes32 messagePasserStorageRoot, bytes32 latestBlockhash) outputRootProof)',
        'tuple(bytes[] stateTrieWitness, bytes[][] storageProofs)',
      ],
      [
        {
          blockNo: block.number,
          disputeGameIndex: block.disputeGameIndex,
          outputRootProof: {
            version:
              '0x0000000000000000000000000000000000000000000000000000000000000000',
            stateRoot: rpcBlock.stateRoot,
            messagePasserStorageRoot,
            latestBlockhash: rpcBlock.hash,
          },
        },
        proof,
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
