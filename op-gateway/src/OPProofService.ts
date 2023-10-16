import { AbiCoder, type AddressLike, JsonRpcProvider } from 'ethers';
import { ethers as ethers5 } from 'ethers5';

import {
  asL2Provider,
  CrossChainMessenger,
  type DeepPartial,
  type OEContractsLike,
} from '@eth-optimism/sdk';
import { EVMProofHelper, type IProofService } from '@ensdomains/evm-gateway';
import { type JsonRpcBlock } from '@ethereumjs/block';

export interface OPProvableBlock {
  number: number;
  l2OutputIndex: number;
}

/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Optimism Bedrock network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class OPProofService implements IProofService<OPProvableBlock> {
  readonly crossChainMessenger: CrossChainMessenger;
  private readonly provider: JsonRpcProvider;
  private readonly helper: EVMProofHelper;
  private readonly delay: number;

  static async create(
    l1ProviderUrl: string,
    l2ProviderUrl: string,
    delay: number,
    contracts?: DeepPartial<OEContractsLike>
  ) {
    const provider = new JsonRpcProvider(l2ProviderUrl);
    const v5l1Provider = new ethers5.providers.StaticJsonRpcProvider(
      l1ProviderUrl
    );
    const v5l2Provider = new ethers5.providers.StaticJsonRpcProvider(
      l2ProviderUrl
    );
    const opts: ConstructorParameters<typeof CrossChainMessenger>[0] = {
      l1ChainId: (await v5l1Provider.getNetwork()).chainId,
      l2ChainId: (await v5l2Provider.getNetwork()).chainId,
      l1SignerOrProvider: v5l1Provider,
      l2SignerOrProvider: asL2Provider(v5l2Provider),
    };
    if (contracts) {
      opts.contracts = contracts;
    }
    const crossChainMessenger = new CrossChainMessenger(opts);
    return new OPProofService(crossChainMessenger, provider, delay);
  }

  private constructor(
    crossChainMessenger: CrossChainMessenger,
    provider: JsonRpcProvider,
    delay: number
  ) {
    this.crossChainMessenger = crossChainMessenger;
    this.provider = provider;
    this.helper = new EVMProofHelper(provider);
    this.delay = delay;
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
    const l2OutputIndex = (
      await this.crossChainMessenger.contracts.l1.L2OutputOracle.latestOutputIndex()
    ).sub(this.delay);

    /**
     *    struct OutputProposal {
     *       bytes32 outputRoot;
     *       uint128 timestamp;
     *       uint128 l2BlockNumber;
     *      }
     */
    const outputProposal =
      await this.crossChainMessenger.contracts.l1.L2OutputOracle.getL2Output(
        l2OutputIndex
      );

    return {
      number: outputProposal.l2BlockNumber.toNumber(),
      l2OutputIndex: l2OutputIndex.toNumber(),
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
    const rpcBlock: JsonRpcBlock = await this.provider.send(
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
      this.crossChainMessenger.contracts.l2.BedrockMessagePasser.address,
      []
    );
    return stateRoot;
  }
}
