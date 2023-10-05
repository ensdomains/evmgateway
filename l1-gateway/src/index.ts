import { L1ProofService, L1ProvableBlock } from './L1ProofService';
import { EVMGateway } from '@ensdomains/evm-gateway';
import { JsonRpcProvider } from 'ethers';

export type L1Gateway = EVMGateway<L1ProvableBlock>;

export function makeL1Gateway(provider: JsonRpcProvider): L1Gateway {
  return new EVMGateway(new L1ProofService(provider));
}
