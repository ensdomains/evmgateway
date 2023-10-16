import { EVMGateway } from '@ensdomains/evm-gateway';
import { OPProofService, type OPProvableBlock } from './OPProofService.js';
import type { DeepPartial, OEContractsLike } from '@eth-optimism/sdk';

export type OPGateway = EVMGateway<OPProvableBlock>;

export async function makeOPGateway(
  l1providerUrl: string,
  l2providerUrl: string,
  delay: number,
  contracts?: DeepPartial<OEContractsLike>
): Promise<OPGateway> {
  return new EVMGateway(
    await OPProofService.create(l1providerUrl, l2providerUrl, delay, contracts)
  );
}

export { OPProofService, type OPProvableBlock };
