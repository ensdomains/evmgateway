import { EVMGateway } from '@ensdomains/evm-gateway';
import { JsonRpcProvider } from 'ethers';
import { OPProofService, type OPProvableBlock } from './OPProofService.js';

export type OPGateway = EVMGateway<OPProvableBlock>;

export async function makeOPGateway(
  l1providerUrl: string,
  l2providerUrl: string,
  l2OutputOracleAddress: string,
  delay: number
): Promise<OPGateway> {
  const l1Provider = new JsonRpcProvider(l1providerUrl);
  const l2Provider = new JsonRpcProvider(l2providerUrl);
  return new EVMGateway(
    await new OPProofService(
      l1Provider,
      l2Provider,
      l2OutputOracleAddress,
      delay
    )
  );
}

export { OPProofService, type OPProvableBlock };
