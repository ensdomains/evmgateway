import { Server } from '@ensdomains/ccip-read-cf-worker';
import type { IProofService, Router } from '@ensdomains/evm-gateway';
import type { OPProvableBlock as OPDisputeGameProvableBlock } from './OPDisputeGameProofService.js';
import type { OPProvableBlock } from './OPProofService.js';
interface Env {
  L1_PROVIDER_URL: string;
  L2_PROVIDER_URL: string;
  L2_OUTPUT_ORACLE: string;
  DELAY: number;
  TYPE: number;
}
let app: Router;
async function fetch(request: Request, env: Env) {
  // Loading libraries dynamically as a temp work around.
  // Otherwise, deployment thorws "Error: Script startup exceeded CPU time limit." error
  if (!app) {
    const ethers = await import('ethers');
    const EVMGateway = (await import('@ensdomains/evm-gateway')).EVMGateway;
    const OPProofService = (await import('./OPProofService.js')).OPProofService;
    const OPDisputeGameProofService = (await import('./OPDisputeGameProofService.js')).OPDisputeGameProofService;
    // Set PROVIDER_URL under .dev.vars locally. Set the key as secret remotely with `wrangler secret put WORKER_PROVIDER_URL`
    const { L1_PROVIDER_URL, L2_PROVIDER_URL, L2_OUTPUT_ORACLE, DELAY, TYPE } = env;
    const l1Provider = new ethers.JsonRpcProvider(L1_PROVIDER_URL);
    const l2Provider = new ethers.JsonRpcProvider(L2_PROVIDER_URL);

    console.log({ L1_PROVIDER_URL, L2_PROVIDER_URL, DELAY, TYPE });

    let proofService: IProofService<OPProvableBlock | OPDisputeGameProvableBlock>;

    if (Number(TYPE) == 0) {
      proofService = new OPProofService(
        l1Provider,
        l2Provider,
        L2_OUTPUT_ORACLE,
        Number(DELAY)
      );
    } else if (Number(TYPE) == 1) {
      proofService = new OPDisputeGameProofService(
        l1Provider,
        l2Provider,
        L2_OUTPUT_ORACLE,
        Number(DELAY),
      );
    } else {
      throw new Error('Invalid output oracle type');
    }

    const gateway = new EVMGateway(proofService);

    const server = new Server();
    gateway.add(server);
    app = server.makeApp('/');
  }
  return app.handle(request);
}

export default {
  fetch,
};
