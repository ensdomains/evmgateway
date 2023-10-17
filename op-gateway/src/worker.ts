import { Server } from '@ensdomains/ccip-read-cf-worker';
interface Env {
    L1_PROVIDER_URL: string
    L2_PROVIDER_URL: string
    DELAY: number
}
async function fetch(request:Request, env:Env){
  // Loading libraries dynamically as a temp work around.
  // Otherwise, deployment thorws "Error: Script startup exceeded CPU time limit." error
  const { EVMGateway } = await import('@ensdomains/evm-gateway');
  const { OPProofService } = await import('./OPProofService.js');
  // Set PROVIDER_URL under .dev.vars locally. Set the key as secret remotely with `wrangler secret put WORKER_PROVIDER_URL`
  const { L1_PROVIDER_URL, L2_PROVIDER_URL, DELAY } = env;
  console.log(env)
  const proof = new EVMGateway(
    await OPProofService.create(
      L1_PROVIDER_URL,
      L2_PROVIDER_URL,
      Number(DELAY)
    )
  );

  const server = new Server();
  proof.add(server);
  const app = server.makeApp("/")
  return app.handle(request)
}

export default {
	fetch,
};
