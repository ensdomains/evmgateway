import { Request as CFWRequest } from '@cloudflare/workers-types';
import { Server } from '@ensdomains/ccip-read-cf-worker';
import type { Router } from '@ensdomains/evm-gateway';
import { Tracker } from '@ensdomains/server-analytics';

interface Env {
  L1_PROVIDER_URL: string;
  L2_PROVIDER_URL: string;
  L2_OUTPUT_ORACLE: string;
  DELAY: number;
  GATEWAY_DOMAIN: string;
  ENDPOINT_URL: string;
}
interface LogResult {
  (request: CFWRequest, result: Response): Promise<Response>;
}

let app: Router, logResult: LogResult;
const decodeUrl = (url: string) => {
  const trackingData = url.match(
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
    L2_OUTPUT_ORACLE,
    DELAY,
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
    const OPProofService = (await import('./OPProofService.js')).OPProofService;
    const l1Provider = new ethers.JsonRpcProvider(L1_PROVIDER_URL);
    const l2Provider = new ethers.JsonRpcProvider(L2_PROVIDER_URL);

    logResult = async (
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
      const logResultData = (
        await new Response(streamForLog).json()
      ).data.substring(0, 200);
      const props = decodeUrl(request.url);
      await tracker.trackEvent(
        request,
        'result',
        { props: { ...props, result: logResultData } },
        true
      );
      const myHeaders = new Headers();
      myHeaders.set('Access-Control-Allow-Origin', '*');
      myHeaders.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
      myHeaders.set('Access-Control-Max-Age', '86400');
      return new Response(streamForResult, { ...result, headers: myHeaders });
    };

    console.log({ L1_PROVIDER_URL, L2_PROVIDER_URL, DELAY });
    const gateway = new EVMGateway(
      new OPProofService(
        l1Provider,
        l2Provider,
        L2_OUTPUT_ORACLE,
        Number(DELAY)
      )
    );

    const server = new Server();
    gateway.add(server);
    app = server.makeApp('/');
  }
  const props = decodeUrl(request.url);
  await tracker.trackEvent(
    request,
    'request',
    { props: { ...props, ...{} } },
    true
  );

  return app.handle(request).then(logResult.bind(null, request));
}

export default {
  fetch,
};
