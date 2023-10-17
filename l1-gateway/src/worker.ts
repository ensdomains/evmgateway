import { Server } from '@ensdomains/ccip-read-cf-worker';
interface Env {
  WORKER_PROVIDER_URL: string
}
let ethers:any, EVMGateway:any, L1ProofService:any
async function fetch(request:Request, env:Env){
  // Loading libraries dynamically as a temp work around.
  // Otherwise, deployment thorws "Error: Script startup exceeded CPU time limit." error
  if(!ethers) ethers = await import('ethers');
  if(!EVMGateway) EVMGateway = (await import('@ensdomains/evm-gateway')).EVMGateway
  if(!L1ProofService) L1ProofService = (await import('./L1ProofService.js')).L1ProofService;
  // const { EVMGateway } = await import('@ensdomains/evm-gateway');
  // const { L1ProofService } = await import('./L1ProofService.js');
  // Set PROVIDER_URL under .dev.vars locally. Set the key as secret remotely with `wrangler secret put WORKER_PROVIDER_URL`
  const { WORKER_PROVIDER_URL } = env;
  const provider = new ethers.JsonRpcProvider(WORKER_PROVIDER_URL);
  const proof = new EVMGateway(new L1ProofService(provider));
  const server = new Server();
  proof.add(server);
  const app = server.makeApp("/")
  return app.handle(request)
}

export default {
	fetch,
};
