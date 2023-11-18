import { EVMGateway } from '@ensdomains/evm-gateway';
import { JsonRpcProvider } from 'ethers';
import { ArbProofService, type ArbProvableBlock } from './ArbProofService.js';
import { ethers as ethers5 } from "ethers5";


export type ArbGateway = EVMGateway<ArbProvableBlock>;

export async function makeArbGateway(
  l1providerUrl: string,
  l2providerUrl: string,
  l2RollupAddress: string,
  l2AssertionHelperaddress: string,
): Promise<ArbGateway> {
  const l2Provider = new JsonRpcProvider(l2providerUrl);
  const l1LegacyProvider = new ethers5.providers.JsonRpcProvider(l1providerUrl);
  const l2LegacyProvider = new ethers5.providers.JsonRpcProvider(l2providerUrl);
  return new EVMGateway(
    await new ArbProofService(
      l2Provider,
      l1LegacyProvider,
      l2LegacyProvider,
      l2RollupAddress,
      l2AssertionHelperaddress
    )
  );
}

export { ArbProofService, type ArbProvableBlock };
