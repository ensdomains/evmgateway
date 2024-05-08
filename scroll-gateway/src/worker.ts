import { Request as CFWRequest } from '@cloudflare/workers-types';
import { Server } from '@ensdomains/ccip-read-cf-worker';
import { propsDecoder, type Router } from '@ensdomains/evm-gateway';
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

async function fetch(request: CFWRequest, env: Env) {
  const {
    L1_PROVIDER_URL,
    L2_PROVIDER_URL,
    L2_ROLLUP,
    GATEWAY_DOMAIN,
    ENDPOINT_URL,
  } = env;

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
    // Set PROVIDER_URL under .dev.vars locally. Set the key as secret remotely with `wrangler secret put WORKER_PROVIDER_URL`
    console.log({env})
    // const { L1_PROVIDER_URL, L2_PROVIDER_URL, L2_ROLLUP } = env;
    // const L1_PROVIDER_URL="https://sepolia.infura.io/v3/6fd03d7c74f3412b810bfd2fddd85ba9"
    // const L2_PROVIDER_URL="https://sepolia-rpc.scroll.io"
    // Scroll verfifier address https://sepolia.etherscan.io/address/0x64cb3A0Dcf43Ae0EE35C1C15edDF5F46D48Fa570#code
    // const L2_ROLLUP="0x64cb3A0Dcf43Ae0EE35C1C15edDF5F46D48Fa570"
    const l1Provider = new ethers.JsonRpcProvider(L1_PROVIDER_URL);
    const l2Provider = new ethers.JsonRpcProvider(L2_PROVIDER_URL);

    const gateway = new EVMGateway(
      new ScrollProofService(
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
  await tracker.trackEvent(request, 'request', { props }, true);
  return app
    .handle(request)
    .then(tracker.logResult.bind(tracker, propsDecoder, request));

}

export default {
  fetch,
};
