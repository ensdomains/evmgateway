import { Request as CFWRequest } from '@cloudflare/workers-types';
import { Server } from '@ensdomains/ccip-read-cf-worker';
import type { Router } from '@ensdomains/evm-gateway';
import { InMemoryBlockCache } from './blockCache/InMemoryBlockCache.js';
import { Tracker } from './tracker.js';
interface Env {
  L1_PROVIDER_URL: string;
  L2_PROVIDER_URL: string;
  L2_ROLLUP: string;
}

let app: Router;
const tracker = new Tracker('arb-sepolia-gateway-worker.ens-cf.workers.dev', {
  enableLogging: true,
});
const logResult = async (
  request: CFWRequest,
  result: Response
): Promise<Response> => {
  if (request.url.match(/favicon/)) {
    return result;
  }
  if (!result.body) {
    return result;
  }
  const [streamForLog, streamForResult] = result.body.tee();
  const logResult = await new Response(streamForLog).json();
  const logResultData = logResult.data.substring(0, 200);
  await tracker.trackEvent(
    'result',
    request,
    { props: { result: logResultData } },
    true
  );
  return new Response(streamForResult, result);
};
async function fetch(request: CFWRequest, env: Env) {
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
      new ArbProofService(
        l1Provider,
        l2Provider,
        L2_ROLLUP,
        new InMemoryBlockCache()
      )
    );

    const server = new Server();
    gateway.add(server);
    app = server.makeApp('/');
  }
  // return app.handle(request);
  return app.handle(request).then(logResult.bind(null, request));
}

export default {
  fetch,
};
