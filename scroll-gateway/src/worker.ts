import { Request as CFWRequest } from '@cloudflare/workers-types';
import { Server } from '@ensdomains/ccip-read-cf-worker';
import { propsDecoder, type Router } from '@ensdomains/evm-gateway';
import { Tracker } from '@ensdomains/server-analytics';

interface Env {
  L1_PROVIDER_URL: string;
  L2_PROVIDER_URL: string;
  L2_ROLLUP: string;
  GATEWAY_DOMAIN: string;
  ENDPOINT_URL: string;
  SEARCH_URL: string;
}

let app: Router;

async function fetch(request: CFWRequest, env: Env) {
  const { L2_PROVIDER_URL, GATEWAY_DOMAIN, ENDPOINT_URL, SEARCH_URL } = env;

  // Loading libraries dynamically as a temp work around.
  // Otherwise, deployment thorws "Error: Script startup exceeded CPU time limit." error
  const tracker = new Tracker(GATEWAY_DOMAIN, {
    apiEndpoint: ENDPOINT_URL,
    enableLogging: true,
  });

  if (!app) {
    const ethers = await import('ethers');

    const EVMGateway = (await import('@ensdomains/evm-gateway')).EVMGateway;
    const ScrollProofService = (await import('./ScrollProofService.js'))
      .ScrollProofService;
    const l2Provider = new ethers.JsonRpcProvider(L2_PROVIDER_URL);

    const gateway = new EVMGateway(
      new ScrollProofService(SEARCH_URL, l2Provider)
    );

    const server = new Server();
    gateway.add(server);
    app = server.makeApp('/');
  }
  const props = propsDecoder(request);
  await tracker.trackEvent(request, 'request', { props }, true);
  return app
    .handle(request)
    .then(tracker.logResult.bind(tracker, propsDecoder, request));
}

export default {
  fetch,
};
