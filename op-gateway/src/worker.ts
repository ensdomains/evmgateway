import { Server } from '@ensdomains/ccip-read-cf-worker';
interface Env {
    L1_PROVIDER_URL: string
    L2_PROVIDER_URL: string
    DELAY: number
}
interface Router{
  handle:(request:Request)=> void
}
let app:Router  
async function fetch(request:Request, env:Env){
  // Loading libraries dynamically as a temp work around.
  // Otherwise, deployment thorws "Error: Script startup exceeded CPU time limit." error
  if(!app){
    const ethers = await import('ethers');
    const EVMGateway = (await import('@ensdomains/evm-gateway')).EVMGateway
    const OPProofService = (await import('./OPProofService.js')).OPProofService;
    // Set PROVIDER_URL under .dev.vars locally. Set the key as secret remotely with `wrangler secret put WORKER_PROVIDER_URL`
    const { L1_PROVIDER_URL, L2_PROVIDER_URL, DELAY } = env;
    const l1Provider = new ethers.JsonRpcProvider(L1_PROVIDER_URL);
    const l2Provider = new ethers.JsonRpcProvider(L2_PROVIDER_URL);
  
    const proof = new EVMGateway(
      await OPProofService.create(
        l1Provider,
        l2Provider,
        Number(DELAY)
      )
    );
  
    const server = new Server();
    proof.add(server);
    app = server.makeApp("/")  
  }
  return app.handle(request)
}

export default {
	fetch,
};
