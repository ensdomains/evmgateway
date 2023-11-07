import type { HandlerDescription } from '@chainlink/ccip-read-server';
import type { Fragment, Interface, JsonFragment } from '@ethersproject/abi';
import {
  concat,
  dataSlice,
  getBytes,
  solidityPackedKeccak256,
  toBigInt,
  zeroPadValue,
} from 'ethers';

import type { IProofService, ProvableBlock } from './IProofService.js';

const OP_CONSTANT = 0x00;
const OP_BACKREF = 0x20;

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

interface Server {
  add: (
    abi: string | readonly (string | Fragment | JsonFragment)[] | Interface,
    handlers: HandlerDescription[]
  ) => void;
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

  add(server: Server) {
    const abi = [
      /**
       * This function implements a simple VM for fetching proofs for EVM contract storage data.
       * Programs consist of an array of `commands` and an array of `constants`. Each `command` is a
       * short program that computes the slot number of a single EVM storage value. The gateway then
       * returns a proof of a value at that slot number. Commands can also specify that the value is
       * dynamic-length, in which case the gateway may return proofs for multiple slots in order for
       * the caller to be able to reconstruct the entire value.
       *
       * Each command is a 32 byte value consisting of a single flags byte, followed by 31 instruction
       * bytes. Valid flags are:
       *  - 0x01 - If set, the value to be returned is dynamic length.
       *
       * The VM implements a very simple stack machine, and instructions specify operations that happen on
       * the stack. In addition, the VM has access to the result of previous commands, referred to here
       * as `values`.
       *
       * The most significant 3 bits of each instruction byte are the opcode, and the least significant
       * 5 bits are the operand. The following opcodes are defined:
       *  - 0x00 - `push(constants[operand])`
       *  - 0x20 - `push(values[operand])`
       *  - 0x70 - `halt` - do not process any further instructions for this command.
       *
       * After a `halt` is reached or the end of the command word is reached, the elements on the stack
       * are hashed recursively, starting with the first element pushed, using a process equivalent
       * to the following:
       *   def hashStack(stack):
       *     right = stack.pop()
       *     if(stack.empty()):
       *       return right
       *     return keccak256(concat(hashStack(stack), right))
       *
       * The final result of this hashing operation is used as the base slot number for the storage
       * lookup. This mirrors Solidity's recursive hashing operation for determining storage slot locations.
       */
      'function getStorageSlots(address addr, bytes32[] memory commands, bytes[] memory constants) external view returns(bytes memory witness)',
    ];
    server.add(abi, [
      {
        type: 'getStorageSlots',
        func: async (args) => {
          try {
            const [addr, commands, constants] = args;
            const proofs = await this.createProofs(addr, commands, constants);
            return [proofs];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (e: any) {
            console.log(e.stack);
            throw e;
          }
        },
      },
    ]);
    return server;
  }

  /**
   *
   * @param address The address to fetch storage slot proofs for
   * @param paths Each element of this array specifies a Solidity-style path derivation for a storage slot ID.
   *              See README.md for details of the encoding.
   */
  async createProofs(
    address: string,
    commands: string[],
    constants: string[]
  ): Promise<string> {
    const block = await this.proofService.getProvableBlock();
    const requests: Promise<StorageElement>[] = [];
    // For each request, spawn a promise to compute the set of slots required
    for (let i = 0; i < commands.length; i++) {
      requests.push(
        this.getValueFromPath(
          block,
          address,
          commands[i],
          constants,
          requests.slice()
        )
      );
    }
    // Resolve all the outstanding requests
    const results = await Promise.all(requests);
    const slots = Array.prototype.concat(
      ...results.map((result) => result.slots)
    );
    return this.proofService.getProofs(block, address, slots);
  }

  private async executeOperation(
    operation: number,
    constants: string[],
    requests: Promise<StorageElement>[]
  ): Promise<string> {
    const opcode = operation & 0xe0;
    const operand = operation & 0x1f;

    switch (opcode) {
      case OP_CONSTANT:
        return constants[operand];
      case OP_BACKREF:
        return await (await requests[operand]).value();
      default:
        throw new Error('Unrecognized opcode');
    }
  }

  private async computeFirstSlot(
    command: string,
    constants: string[],
    requests: Promise<StorageElement>[]
  ): Promise<{ slot: bigint; isDynamic: boolean }> {
    const commandWord = getBytes(command);
    const flags = commandWord[0];
    const isDynamic = (flags & 0x01) != 0;

    let slot = toBigInt(
      await this.executeOperation(commandWord[1], constants, requests)
    );

    // If there are multiple path elements, recursively hash them solidity-style to get the final slot.
    for (let j = 2; j < 32 && commandWord[j] != 0xff; j++) {
      const index = await this.executeOperation(
        commandWord[j],
        constants,
        requests
      );
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
    command: string,
    constants: string[],
    requests: Promise<StorageElement>[]
  ): Promise<StorageElement> {
    const { slot, isDynamic } = await this.computeFirstSlot(
      command,
      constants,
      requests
    );

    if (!isDynamic) {
      return {
        slots: [slot],
        isDynamic,
        value: memoize(async () =>
          zeroPadValue(
            await this.proofService.getStorageAt(block, address, slot),
            32
          )
        ),
      };
    } else {
      return this.getDynamicValue(block, address, slot);
    }
  }
}
