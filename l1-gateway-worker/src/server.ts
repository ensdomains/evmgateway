import { EVMGateway } from '@ensdomains/evm-gateway';
import { ethers } from 'ethers';
import { L1ProofService } from './L1ProofService.js';
import { Server } from '@ensdomains/ccip-read-cf-worker';

function fetch(request:any, env:any, _context:any){
  console.log({request}, {env},{ _context})
  const { PROVIDER_URL } = env;
  console.log({PROVIDER_URL})
  const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
  const gateway = new EVMGateway(new L1ProofService(provider));
  const server = new Server();
  const app = gateway.makeApp(server, '/');
  return app.handle(request)
}

export default {
	fetch,
};
