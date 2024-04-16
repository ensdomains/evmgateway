import { EVMGateway } from '@ensdomains/evm-gateway';
import { JsonRpcProvider } from 'ethers';
import { OPProofService, type OPProvableBlock } from './OPProofService.js';
import {
  OPDisputeGameProofService,
  type OPProvableBlock as OPDisputeGameProvableBlock,
} from './OPDisputeGameProofService.js';

export type OPGateway = EVMGateway<
  OPProvableBlock | OPDisputeGameProvableBlock
>;

export async function makeOPGateway(
  l1providerUrl: string,
  l2providerUrl: string,
  l2OutputOracleAddress: string,
  delay: number,
  type: number,
): Promise<OPGateway> {
  const l1Provider = new JsonRpcProvider(l1providerUrl);
  const l2Provider = new JsonRpcProvider(l2providerUrl);

  if (type == 0) {
    return new EVMGateway(
      await new OPProofService(
        l1Provider,
        l2Provider,
        l2OutputOracleAddress,
        delay
      )
    );
  } else {
    return new EVMGateway(
      await new OPDisputeGameProofService(
        l1Provider,
        l2Provider,
        l2OutputOracleAddress,
        delay
      )
    );
  }
}

export { OPProofService, type OPProvableBlock };
