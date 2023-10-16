import { Server } from '@ensdomains/ccip-read-cf-worker';

async function fetch(request:any, env:any, _context:any){
  // Loading libraries dynamically as a temp work around.
  // Otherwise, deployment thorws "Error: Script startup exceeded CPU time limit." error
  const ethers = await import('ethers');
  const { EVMGateway } = await import('@ensdomains/evm-gateway');
  const { L1ProofService } = await import('@ensdomains/l1-gateway');
  // Set PROVIDER_URL under .dev.vars locally. Set the key as secret remotely with `wrangler secret put WORKER_PROVIDER_URL`
  const { WORKER_PROVIDER_URL } = env;
  console.log({WORKER_PROVIDER_URL})
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
