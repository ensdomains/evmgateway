import { Server } from '@ensdomains/ccip-read-cf-worker';
import { createCors } from 'itty-router';
import type { Router } from '@ensdomains/evm-gateway';

interface Env {
  L1_PROVIDER_URL: string;
  L2_PROVIDER_URL: string;
  L2_ROLLUP: string;
}

const {corsify, preflight} = createCors()
let app: Router;
async function fetch(request: Request, env: Env) {
  // Loading libraries dynamically as a temp work around.
  // Otherwise, deployment thorws "Error: Script startup exceeded CPU time limit." error
  if (!app) {
    const ethers = await import('ethers');

    const EVMGateway = (await import('@ensdomains/evm-gateway')).EVMGateway;
    const ArbProofService = (await import('./ArbProofService.js'))
      .ArbProofService;
    // Set PROVIDER_URL under .dev.vars locally. Set the key as secret remotely with `wrangler secret put WORKER_PROVIDER_URL`
    const { L1_PROVIDER_URL, L2_PROVIDER_URL, L2_ROLLUP } = env;

    const l1Provider = new ethers.JsonRpcProvider(L1_PROVIDER_URL);
    const l2Provider = new ethers.JsonRpcProvider(L2_PROVIDER_URL);

    console.log({ L1_PROVIDER_URL, L2_PROVIDER_URL });
    const gateway = new EVMGateway(
      new ArbProofService(l1Provider, l2Provider, L2_ROLLUP)
    );

    const server = new Server();
    gateway.add(server);
    app = server.makeApp('/');
    app.all('*', preflight);
  }
  return app.handle(request).then(corsify);
}

export default {
  fetch,
};
