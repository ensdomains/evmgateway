import { Server } from '@chainlink/ccip-read-server';
import { Command } from '@commander-js/extra-typings';
import { EVMGateway } from '@ensdomains/evm-gateway';
import { JsonRpcProvider } from 'ethers';
import { OPProofService } from './OPProofService.js';
import { OPDisputeGameProofService } from './OPDisputeGameProofService.js';
import type { IProofService } from '@ensdomains/evm-gateway';

const program = new Command()
  .option('-p, --port <port>', 'port to listen on', '8080')
  .option(
    '-u, --l1-provider-url <url>',
    'l1 provider url',
    'http://localhost:8545/'
  )
  .option(
    '-v, --l2-provider-url <url>',
    'l2 provider url',
    'http://localhost:9545/'
  )
  .option(
    '-o --l2-output-oracle <address>',
    'address for L2 output oracle on the L1',
    ''
  )
  .option('-d, --delay <number>', 'number of delay to use (in minutes for DisputeGame)', '5')
  .option('-t, --type <number>', '0 - L2OutputOracle, 1 - DisputeGame', '1');

program.parse();

(async () => {
  const options = program.opts();

  const l1Provider = new JsonRpcProvider(options.l1ProviderUrl);
  const l2Provider = new JsonRpcProvider(options.l2ProviderUrl);

  let proofService: IProofService<any>
  
  if (Number(options.type) == 0) {
    proofService = new OPProofService(
      l1Provider,
      l2Provider,
      options.l2OutputOracle,
      Number(options.delay)
    )
  } else if (Number(options.type) == 1) {
    proofService = new OPDisputeGameProofService(
      l1Provider,
      l2Provider,
      options.l2OutputOracle,
      Number(options.delay)
    )
  } else {
    throw new Error('Invalid output oracle type');
  }

  const gateway = new EVMGateway(proofService);
  const server = new Server();
  gateway.add(server);
  const app = server.makeApp('/');

  const port = parseInt(options.port);
  if (String(port) !== options.port) throw new Error('Invalid port');

  app.listen(port, function () {
    console.log(`Listening on ${port}`);
  });
})();
