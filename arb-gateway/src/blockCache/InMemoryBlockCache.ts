import type { IBlockCache } from './IBlockCache.js';

//Dummy in memory cache for storing block data. Replace with something more sophisticated like redis in the future
export class InMemoryBlockCache implements IBlockCache {
  private block: Record<string, never>;
  private nodeIndex: bigint;
  private sendRoot: string;

  constructor() {
    this.block = {};
    this.nodeIndex = 0n;
    this.sendRoot = '';
  }

  public async getBlock(nodeIndex: bigint): Promise<{
    nodeIndex: bigint;
    block: Record<string, string>;
    sendRoot: string;
  } | null> {
    //Cache miss
    if (nodeIndex !== this.nodeIndex) {
      console.log('Cache miss for nodeIndex: ', nodeIndex);
      return null;
    }
    //Cache hit
    return {
      nodeIndex: this.nodeIndex,
      block: this.block,
      sendRoot: this.sendRoot,
    };
  }

  public async setBlock(
    nodeIndex: bigint,
    block: Record<string, never>,
    sendRoot: string
  ) {
    console.log('Setting new block for nodeIndex: ', nodeIndex);

    this.nodeIndex = nodeIndex;
    this.block = block;
    this.sendRoot = sendRoot;
  }
}
