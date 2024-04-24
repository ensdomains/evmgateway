import { EVMGateway } from '@ensdomains/evm-gateway';
import { JsonRpcProvider } from 'ethers';
import { ScrollProofService, type ScrollProvableBlock } from './ScrollProofService.js';
import { InMemoryBlockCache } from './blockCache/InMemoryBlockCache.js';

export type ScrollGateway = EVMGateway<ScrollProvableBlock>;

export async function makeScrollGateway(
  l1providerUrl: string,
  l2providerUrl: string,
  l2RollupAddress: string
): Promise<ScrollGateway> {
  const l1Provider = new JsonRpcProvider(l1providerUrl);
  const l2Provider = new JsonRpcProvider(l2providerUrl);
  return new EVMGateway(
    new ScrollProofService(
      l1Provider,
      l2Provider,
      l2RollupAddress,
      new InMemoryBlockCache()
    )
  );
}

export { ScrollProofService, type ScrollProvableBlock };
