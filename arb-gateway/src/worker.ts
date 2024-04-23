import { Request as CFWRequest } from '@cloudflare/workers-types';
import { Server } from '@ensdomains/ccip-read-cf-worker';
import type { Router } from '@ensdomains/evm-gateway';
import { InMemoryBlockCache } from './blockCache/InMemoryBlockCache.js';
import { Tracker } from '@ensdomains/server-analytics';
interface Env {
  L1_PROVIDER_URL: string;
  L2_PROVIDER_URL: string;
  L2_ROLLUP: string;
  GATEWAY_DOMAIN: string;
  ENDPOINT_URL: string;
}

let app: Router;

const propsDecoder = (request: CFWRequest) => {
  const trackingData = request.url.match(
    /\/0x[a-fA-F0-9]{40}\/0x[a-fA-F0-9]{1,}\.json/
  );
  if (trackingData) {
    return {
      sender: trackingData[0].slice(1, 42),
      calldata: trackingData[0].slice(44).replace('.json', ''),
    };
  } else {
    return {};
  }
};

async function fetch(request: CFWRequest, env: Env) {
  // Set PROVIDER_URL under .dev.vars locally. Set the key as secret remotely with `wrangler secret put WORKER_PROVIDER_URL`
  const {
    L1_PROVIDER_URL,
    L2_PROVIDER_URL,
    L2_ROLLUP,
    GATEWAY_DOMAIN,
    ENDPOINT_URL,
  } = env;
  const tracker = new Tracker(GATEWAY_DOMAIN, {
    apiEndpoint: ENDPOINT_URL,
    enableLogging: true,
  });

  // Loading libraries dynamically as a temp work around.
  // Otherwise, deployment thorws "Error: Script startup exceeded CPU time limit." error
  if (!app) {
    const ethers = await import('ethers');

    const EVMGateway = (await import('@ensdomains/evm-gateway')).EVMGateway;
    const ArbProofService = (await import('./ArbProofService.js'))
      .ArbProofService;

    const l1Provider = new ethers.JsonRpcProvider(L1_PROVIDER_URL);
    const l2Provider = new ethers.JsonRpcProvider(L2_PROVIDER_URL);

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

  const props = propsDecoder(request);
  await tracker.trackEvent(
    request,
    'request',
    { props: { ...props, ...{} } },
    true
  );
  return app
    .handle(request)
    .then(tracker.logResult.bind(null, request, propsDecoder));
}

export default {
  fetch,
};
