import { Server } from '@ensdomains/ccip-read-cf-worker';
import type { Router } from '@ensdomains/evm-gateway';
interface Env {
  L1_PROVIDER_URL: string;
  L2_PROVIDER_URL: string;
  L2_ROLLUP: string;
  L2_ASSERTION_HELPER: string;
}

let app: Router;
async function fetch(request: Request, env: Env) {
  // Loading libraries dynamically as a temp work around.
  // Otherwise, deployment thorws "Error: Script startup exceeded CPU time limit." error
  if (!app) {
    const ethers = await import('ethers');
    const ethers5 = await import('ethers5');

    const EVMGateway = (await import('@ensdomains/evm-gateway')).EVMGateway;
    const ArbProofService = (await import('./ArbProofService.js'))
      .ArbProofService;
    // Set PROVIDER_URL under .dev.vars locally. Set the key as secret remotely with `wrangler secret put WORKER_PROVIDER_URL`
    const { L1_PROVIDER_URL, L2_PROVIDER_URL, L2_ROLLUP, L2_ASSERTION_HELPER } = env;

    const l2Provider = new ethers.JsonRpcProvider(L2_PROVIDER_URL);

    const l1LegacyProvider = new ethers5.providers.JsonRpcProvider(
      L1_PROVIDER_URL
    );
    const l2LegacyProvider = new ethers5.providers.JsonRpcProvider(
      L2_PROVIDER_URL
    );

    console.log({ L1_PROVIDER_URL, L2_PROVIDER_URL });
    const gateway = new EVMGateway(
      new ArbProofService(
        l2Provider,
        l1LegacyProvider,
        l2LegacyProvider,
        L2_ROLLUP,
        L2_ASSERTION_HELPER
      )
    );

    const server = new Server();
    gateway.add(server);
    app = server.makeApp('/');
  }
  return app.handle(request);
}

export default {
  fetch,
};
