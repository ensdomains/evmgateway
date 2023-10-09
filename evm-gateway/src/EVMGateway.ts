import { Server } from '@chainlink/ccip-read-server';
import {
  concat,
  dataSlice,
  getBytes,
  solidityPackedKeccak256,
  toBigInt,
} from 'ethers';
import type { IProofService, ProvableBlock } from './IProofService.js';

const MAGIC_SLOT =
  0xd3b7df68fbfff5d2ac8f3603e97698b8e10d49e5cc92d1c72514f593c17b2229n;
const UINT256_MSB =
  0x8000000000000000000000000000000000000000000000000000000000000000n;

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

interface StorageElement {
  slots: bigint[];
  value: () => Promise<string>;
  isDynamic: boolean;
}

function memoize<T>(fn: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined;
  return () => {
    if (!promise) {
      promise = fn();
    }
    return promise;
  };
}

export class EVMGateway<T extends ProvableBlock> {
  readonly proofService: IProofService<T>;

  constructor(proofService: IProofService<T>) {
    this.proofService = proofService;
  }

  makeApp(path: string) {
    const server = new Server();
    const abi = [
      'function getStorageSlots(address addr, bytes[][] memory paths) external view returns(bytes memory witness)',
    ];
    server.add(abi, [
      {
        type: 'getStorageSlots',
        func: async (args) => {
          const [addr, paths] = args;
          const proofs = await this.createProofs(addr, paths);
          return [proofs];
        },
      },
    ]);
    return server.makeApp(path);
  }

  /**
   *
   * @param address The address to fetch storage slot proofs for
   * @param paths Each element of this array specifies a Solidity-style path derivation for a storage slot ID.
   *              See README.md for details of the encoding.
   */
  async createProofs(address: string, paths: string[][]): Promise<string> {
    const block = await this.proofService.getProvableBlock();
    const requests: Promise<StorageElement>[] = [];
    // For each request, spawn a promise to compute the set of slots required
    for (let i = 0; i < paths.length; i++) {
      requests.push(
        this.getValueFromPath(block, address, paths[i], requests.slice())
      );
    }
    // Resolve all the outstanding requests
    const results = await Promise.all(requests);
    const slots = Array.prototype.concat(
      ...results.map((result) => result.slots)
    );
    return this.proofService.getProofs(block, address, slots);
  }

  private async computeFirstSlot(
    path: string[],
    requests: Promise<StorageElement>[]
  ): Promise<{ slot: bigint; isDynamic: boolean }> {
    let slot = toBigInt(path[0]);

    // MSB indicates if the proof should be dynamic; check it and mask it out.
    const isDynamic = (slot & UINT256_MSB) !== BigInt(0);
    slot &= UINT256_MSB - BigInt(1);

    // If there are multiple path elements, recursively hash them solidity-style to get the final slot.
    for (let j = 1; j < path.length; j++) {
      let index = getBytes(path[j]);
      // Indexes close to MAGIC_SLOT are replaced with the result of a previous operation.
      const offset = toBigInt(index) - MAGIC_SLOT;
      if (offset >= 0 && offset < requests.length) {
        const targetElement = await requests[Number(offset)];
        index = getBytes(await targetElement.value());
      }
      slot = toBigInt(
        solidityPackedKeccak256(['bytes', 'uint256'], [index, slot])
      );
    }

    return { slot, isDynamic };
  }

  private async getDynamicValue(
    block: T,
    address: string,
    slot: bigint
  ): Promise<StorageElement> {
    const firstValue = getBytes(
      await this.proofService.getStorageAt(block, address, slot)
    );
    // Decode Solidity dynamic value encoding
    if (firstValue[31] & 0x01) {
      // Long value: first slot is `length * 2 + 1`, following slots are data.
      const len = (Number(toBigInt(firstValue)) - 1) / 2;
      const hashedSlot = toBigInt(solidityPackedKeccak256(['uint256'], [slot]));
      const slotNumbers = Array(Math.ceil(len / 32))
        .fill(BigInt(hashedSlot))
        .map((i, idx) => i + BigInt(idx));
      return {
        slots: Array.prototype.concat([slot], slotNumbers),
        isDynamic: true,
        value: memoize(async () => {
          const values = await Promise.all(
            slotNumbers.map((slot) =>
              this.proofService.getStorageAt(block, address, slot)
            )
          );
          return dataSlice(concat(values), 0, len);
        }),
      };
    } else {
      // Short value: least significant byte is `length * 2`, other bytes are data.
      const len = firstValue[31] / 2;
      return {
        slots: [slot],
        isDynamic: true,
        value: () => Promise.resolve(dataSlice(firstValue, 0, len)),
      };
    }
  }

  private async getValueFromPath(
    block: T,
    address: string,
    path: string[],
    requests: Promise<StorageElement>[]
  ): Promise<StorageElement> {
    const { slot, isDynamic } = await this.computeFirstSlot(path, requests);

    if (!isDynamic) {
      return {
        slots: [slot],
        isDynamic,
        value: memoize(() =>
          this.proofService.getStorageAt(block, address, slot)
        ),
      };
    } else {
      return this.getDynamicValue(block, address, slot);
    }
  }
}
