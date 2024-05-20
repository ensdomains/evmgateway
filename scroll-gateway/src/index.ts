import { EVMGateway } from '@ensdomains/evm-gateway';
import { JsonRpcProvider } from 'ethers';
import {
  ScrollProofService,
  type ScrollProvableBlock,
} from './ScrollProofService.js';

export type ScrollGateway = EVMGateway<ScrollProvableBlock>;

export async function makeScrollGateway(
  searchUrl: string,
  l2providerUrl: string
): Promise<ScrollGateway> {
  const l2Provider = new JsonRpcProvider(l2providerUrl);
  return new EVMGateway(new ScrollProofService(searchUrl, l2Provider));
}

export { ScrollProofService, type ScrollProvableBlock };
