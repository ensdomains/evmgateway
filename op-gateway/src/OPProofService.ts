import { EVMProofHelper, type IProofService } from '@ensdomains/evm-gateway';
import { type JsonRpcBlock } from '@ethereumjs/block';
import { AbiCoder, Contract, JsonRpcProvider, type AddressLike } from 'ethers';

export class InvalidOptimismPortalError extends Error {
  constructor() {
    super("OptimismPortal is invalid")
  }
}

export class DisputeGameChallengedError extends Error {
  constructor() {
    super("Dispute game is challenged")
  }
}

export interface OPProvableBlock {
  number: number;
  l2OutputIndex: number;
}

// uint256 index, bytes32 metadata, uint64 timestamp, bytes32 rootClaim, bytes extraData
interface FindLatestGamesResult {
  index: bigint;
  metadata: string;
  timestamp: bigint;
  rootClaim: string;
  extraData: string;
}

const L2_OUTPUT_ORACLE_ABI = [
  'function latestOutputIndex() external view returns (uint256)',
  'function getL2Output(uint256 _l2OutputIndex) external view returns (tuple(bytes32 outputRoot, uint128 timestamp, uint128 l2BlockNumber))',
];

const L2_TO_L1_MESSAGE_PASSER_ADDRESS =
  '0x4200000000000000000000000000000000000016';

const DISPUTE_GAME_FACTORY_ABI = [
  'function gameAtIndex(uint256 _index) external view returns (uint32 gameType_, uint64 timestamp_, address proxy_)',
  'function gameCount() external view returns (uint256 gameCount_)',
  'function findLatestGames(uint32 _gameType, uint256 _start, uint256 _n) external view returns (tuple(uint256 index, bytes32 metadata, uint64 timestamp, bytes32 rootClaim, bytes extraData)[] memory games_)',
];

const FAULT_DISPUTE_GAME_ABI = [
  // The l2BlockNumber of the disputed output root in the `L2OutputOracle`.
  'function l2BlockNumber() external view returns (uint256 l2BlockNumber_)',
  // The output root of the game
  'function rootClaim() external view returns (bytes32 rootClaim_)',
  // Status of the game challenging
  'function status() external view returns (uint8)',
];

// Period to automatically check for dispute game merge
const DISPUTE_GAME_MERGE_CHECK_PERIOD = 3600

/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Optimism Bedrock network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class OPProofService implements IProofService<OPProvableBlock> {
  private readonly l1Provider: JsonRpcProvider;
  private readonly l2Provider: JsonRpcProvider;
  private readonly helper: EVMProofHelper;
  private readonly delay: number;

  private l2OutputOracle: Contract | undefined;
  private disputeGameFactory: Contract | undefined;

  constructor(
    l1Provider: JsonRpcProvider,
    l2Provider: JsonRpcProvider,
    optimismPortalAddress: string,
    delay: number
  ) {
    this.l1Provider = l1Provider;
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
    if (this.disputeGameFactory) {
      const respectedGameType = 0;

      /**
       * Get the latest output from the L2Oracle. We're building the proof with this batch
       * We go a few batches backwards to avoid errors like delays between nodes
       *
       */
      const gameCount = Number(await this.disputeGameFactory.gameCount());
  
      const games: FindLatestGamesResult[] =
        await this.disputeGameFactory.findLatestGames(
          respectedGameType,
          gameCount - 1,
          50
        );
  
      const timestampNow = Math.floor(Date.now() / 1000);
      let disputeGameIndex = -1;
      let disputeGameLocalIndex = -1;
  
      for (let i = 0; i < games.length; i++) {
        if (timestampNow - Number(games[i].timestamp) >= this.delay) {
          disputeGameIndex = Number(games[i].index);
          disputeGameLocalIndex = i;
          break;
        }
      }
  
      // If game is not found then fallback to the L2OutputOracle
      // for just merged case
      if (disputeGameIndex != -1) {
        const [gameType, timestamp, proxy] =
          await this.disputeGameFactory.gameAtIndex(disputeGameIndex);
  
        if (
          gameType != respectedGameType ||
          timestamp != games[disputeGameLocalIndex].timestamp
        ) {
          throw new Error('Mismatched Game Data');
        }
    
        const disputeGame = new Contract(
          proxy,
          FAULT_DISPUTE_GAME_ABI,
          this.l1Provider
        );
    
        const l2BlockNumber = await disputeGame.l2BlockNumber();
        const gameStatus = await disputeGame.status();
    
        // gameStatus == CHALLENGER_WINS
        if (gameStatus == 1) {
          throw new DisputeGameChallengedError();
        }
    
        return {
          number: l2BlockNumber,
          l2OutputIndex: disputeGameIndex,
        };
      }
    }

    if (this.l2OutputOracle) {
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

    throw new InvalidOptimismPortalError();
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
        'tuple(bytes[] stateTrieWitness, bytes[][] storageProofs)',
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
