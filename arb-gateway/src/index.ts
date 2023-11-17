import { EVMGateway } from '@ensdomains/evm-gateway';
import { JsonRpcProvider } from 'ethers';
import { ArbProofService, type ArbProvableBlock } from './ArbProofService.js';

export type ArbGateway = EVMGateway<ArbProvableBlock>;

export async function makeArbGateway(
  l1providerUrl: string,
  l2providerUrl: string,
  l2OutboxAddress: string
): Promise<ArbGateway> {
  const l1Provider = new JsonRpcProvider(l1providerUrl);
  const l2Provider = new JsonRpcProvider(l2providerUrl);
  return new EVMGateway(
    await new ArbProofService(l1Provider, l2Provider, l2OutboxAddress)
  );
}

export { ArbProofService, type ArbProvableBlock };
