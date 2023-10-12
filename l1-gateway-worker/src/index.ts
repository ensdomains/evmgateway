import { EVMGateway } from '@ensdomains/evm-gateway';
import { JsonRpcProvider } from 'ethers';
import { L1ProofService, type L1ProvableBlock } from './L1ProofService.js';

export type L1Gateway = EVMGateway<L1ProvableBlock>;

export function makeL1Gateway(provider: JsonRpcProvider): L1Gateway {
  return new EVMGateway(new L1ProofService(provider));
}

export { L1ProofService, type L1ProvableBlock };
